# websocket_server.py - WebSocket 版本的 WebRTC 信令服务器
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
from typing import Dict, Optional
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WebRTC 信令服务器 (WebSocket版)")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Dict] = {}
        self.user_rooms: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"用户 {user_id} 建立 WebSocket 连接")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_rooms:
            room_id = self.user_rooms[user_id]
            self.leave_room(user_id, room_id)
        logger.info(f"用户 {user_id} 断开连接")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"发送消息给 {user_id} 失败: {e}")
        return False

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: Optional[str] = None):
        if room_id not in self.rooms:
            return
        for user_id in self.rooms[room_id]["users"]:
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_personal_message(message, user_id)

    def join_room(self, user_id: str, room_id: str) -> dict:
        logger.info(f"用户 {user_id} 尝试加入房间 {room_id}")
        if user_id in self.user_rooms:
            old_room = self.user_rooms[user_id]
            if old_room == room_id:
                return {"success": False, "message": "您已在此房间中"}
            else:
                self.leave_room(user_id, old_room)

        if room_id not in self.rooms:
            self.rooms[room_id] = {"users": [], "created_at": datetime.now()}
            logger.info(f"创建新房间: {room_id}")

        room = self.rooms[room_id]
        if len(room["users"]) >= 2:
            return {"success": False, "message": "房间已满（最多2人）"}

        room["users"].append(user_id)
        self.user_rooms[user_id] = room_id
        logger.info(f"用户 {user_id} 成功加入房间 {room_id}")

        other_users = [u for u in room["users"] if u != user_id]
        return {
            "success": True,
            "room_id": room_id,
            "user_count": len(room["users"]),
            "other_users": other_users,
            "is_room_full": len(room["users"]) == 2
        }

    def leave_room(self, user_id: str, room_id: str):
        if room_id in self.rooms and user_id in self.rooms[room_id]["users"]:
            self.rooms[room_id]["users"].remove(user_id)
            if len(self.rooms[room_id]["users"]) == 0:
                del self.rooms[room_id]
        if user_id in self.user_rooms:
            del self.user_rooms[user_id]

    def get_room_other_user(self, room_id: str, current_user: str) -> Optional[str]:
        if room_id in self.rooms:
            for user in self.rooms[room_id]["users"]:
                if user != current_user:
                    return user
        return None

    def get_all_rooms(self):
        return [
            {
                "room_id": room_id,
                "users": room["users"],
                "user_count": len(room["users"]),
                "created_at": room["created_at"].isoformat()
            }
            for room_id, room in self.rooms.items()
        ]


manager = ConnectionManager()


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")

            if message_type == "join-room":
                await handle_join_room(user_id, message)
            elif message_type == "offer":
                await handle_offer(user_id, message)
            elif message_type == "answer":
                await handle_answer(user_id, message)
            elif message_type == "ice-candidate":
                await handle_ice_candidate(user_id, message)
            elif message_type == "leave-room":
                await handle_leave_room(user_id, message)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        if user_id in manager.user_rooms:
            room_id = manager.user_rooms[user_id]
            await manager.broadcast_to_room({
                "type": "user-left",
                "user_id": user_id,
                "message": f"用户 {user_id} 已离开房间"
            }, room_id, exclude_user=user_id)


async def handle_join_room(user_id: str, message: dict):
    room_id = message.get("room_id")
    if not room_id:
        await manager.send_personal_message({
            "type": "error",
            "message": "房间号不能为空"
        }, user_id)
        return

    result = manager.join_room(user_id, room_id)
    await manager.send_personal_message({
        "type": "room-joined",
        **result
    }, user_id)

    if result["success"] and result["other_users"]:
        await manager.broadcast_to_room({
            "type": "user-joined",
            "user_id": user_id,
            "message": f"用户 {user_id} 加入了房间"
        }, room_id, exclude_user=user_id)


async def handle_offer(user_id: str, message: dict):
    room_id = manager.user_rooms.get(user_id)
    if not room_id:
        await manager.send_personal_message({
            "type": "error",
            "message": "您还未加入房间"
        }, user_id)
        return
    target_user = manager.get_room_other_user(room_id, user_id)
    if target_user:
        await manager.send_personal_message({
            "type": "offer",
            "from": user_id,
            "offer": message.get("offer")
        }, target_user)


async def handle_answer(user_id: str, message: dict):
    room_id = manager.user_rooms.get(user_id)
    if not room_id:
        await manager.send_personal_message({
            "type": "error",
            "message": "您还未加入房间"
        }, user_id)
        return
    target_user = manager.get_room_other_user(room_id, user_id)
    if target_user:
        await manager.send_personal_message({
            "type": "answer",
            "from": user_id,
            "answer": message.get("answer")
        }, target_user)


async def handle_ice_candidate(user_id: str, message: dict):
    room_id = manager.user_rooms.get(user_id)
    if not room_id:
        return
    target_user = manager.get_room_other_user(room_id, user_id)
    if target_user:
        await manager.send_personal_message({
            "type": "ice-candidate",
            "from": user_id,
            "candidate": message.get("candidate")
        }, target_user)


async def handle_leave_room(user_id: str, message: dict):
    room_id = manager.user_rooms.get(user_id)
    if room_id:
        await manager.broadcast_to_room({
            "type": "user-left",
            "user_id": user_id,
            "message": f"用户 {user_id} 离开了房间"
        }, room_id, exclude_user=user_id)
        manager.leave_room(user_id, room_id)


@app.get("/")
async def root():
    return {
        "message": "WebRTC WebSocket 信令服务器运行中",
        "status": "ok",
        "connected_users": len(manager.active_connections),
        "active_rooms": len(manager.rooms)
    }


@app.get("/api/rooms")
async def get_all_rooms():
    return {
        "rooms": manager.get_all_rooms(),
        "total_rooms": len(manager.rooms),
        "connected_users": len(manager.active_connections)
    }


@app.delete("/api/reset-rooms")
async def reset_all_rooms():
    room_count = len(manager.rooms)
    manager.rooms.clear()
    manager.user_rooms.clear()
    for user_id in list(manager.active_connections.keys()):
        await manager.send_personal_message({
            "type": "rooms-reset",
            "message": "所有房间已被重置"
        }, user_id)
    return {
        "success": True,
        "message": f"已重置 {room_count} 个房间",
        "rooms_cleared": room_count
    }


@app.delete("/api/reset-room/{room_id}")
async def reset_single_room(room_id: str):
    if room_id in manager.rooms:
        users = manager.rooms[room_id]["users"].copy()
        await manager.broadcast_to_room({
            "type": "room-reset",
            "message": f"房间 {room_id} 已被重置"
        }, room_id)
        for user in users:
            manager.leave_room(user, room_id)
        return {"success": True, "message": f"已重置房间 {room_id}"}
    else:
        return {"success": False, "message": f"房间 {room_id} 不存在"}


if __name__ == "__main__":
    import uvicorn
    print("🚀 启动 WebRTC WebSocket 信令服务器...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
