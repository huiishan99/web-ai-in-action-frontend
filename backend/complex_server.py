# main.py - FastAPI WebRTC 信令服务器
# main.py - FastAPI WebRTC 信令服务器
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import uuid
from typing import Dict, Optional
import logging


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WebRTC 信令服务器")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class SDPOffer(BaseModel):
    sdp: str
    type: str

class JoinRoomRequest(BaseModel):
    roomId: str
    userId: str
    offer: SDPOffer

class CallUserRequest(BaseModel):
    from_user: str = Field(alias="from")
    to: str
    offer: SDPOffer


class AnswerRequest(BaseModel):
    call_id: Optional[str] = None  # 增加字段：用于唯一标识呼叫
    accept: Optional[bool] = True  # 增加字段：用于指示是否接受呼叫
    roomId: Optional[str] = None
    from_user: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None
    answer: Optional[SDPOffer] = None  # 可为空，避免 reject 时出错

# 全局状态管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Dict] = {}
        self.users: Dict[str, Dict] = {}
        self.pending_calls: Dict[str, Dict] = {}

    async def connect_user(self, user_id: str, websocket: WebSocket):
        """用户连接"""
        await
        websocket.accept()
        self.active_connections[user_id] = websocket
        self.users[user_id] = {"status": "online", "room_id": None}
        logger.info(f"用户 {user_id} 已连接")
        await self.broadcast_user_status(user_id, "online")

    async def disconnect_user(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        if user_id in self.users and self.users[user_id].get("room_id"):
            await self.leave_room(user_id, self.users[user_id]["room_id"])

        if user_id in self.users:
            del self.users[user_id]

        logger.info(f"用户 {user_id} 已断开连接")
        await self.broadcast_user_status(user_id, "offline")

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"发送消息给 {user_id} 失败: {e}")
                await self.disconnect_user(user_id)
                return False
        return False

    async def broadcast_user_status(self, user_id: str, status: str):
        """广播用户状态变化"""
        message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status
        }

        for uid, ws in self.active_connections.items():
            if uid != user_id:
                await self.send_to_user(uid, message)

    async def join_room(self, user_id: str, room_id: str, offer: dict):
        if room_id not in self.rooms:
            self.rooms[room_id] = {"users": [], "offers": {}, "answers": {}}

        room = self.rooms[room_id]

        # 检查房间是否已满
        if len(room["users"]) >= 2:
            return {"success": False, "message": "房间已满"}

        room["users"].append(user_id)
        room["offers"][user_id] = offer
        self.users[user_id]["room_id"] = room_id
        self.users[user_id]["status"] = "busy"

        logger.info(f"用户 {user_id} 加入房间 {room_id}")

        if len(room["users"]) == 2:
            user1, user2 = room["users"]
            other_user = user2 if user_id == user1 else user1
            other_offer = room["offers"][other_user]

            await self.send_to_user(user_id, {
                "type": "room_matched",
                "room_id": room_id,
                "peer_id": other_user,
                "peer_offer": other_offer
            })

            await self.send_to_user(other_user, {
                "type": "room_matched",
                "room_id": room_id,
                "peer_id": user_id,
                "peer_offer": offer
            })

            return {"success": True, "matched": True, "peer_id": other_user}
        else:
            return {"success": True, "matched": False, "waiting": True}

    async def leave_room(self, user_id: str, room_id: str):
        if room_id in self.rooms:
            room = self.rooms[room_id]
            if user_id in room["users"]:
                room["users"].remove(user_id)

                # 通知房间内其他用户
                for other_user in room["users"]:
                    await self.send_to_user(other_user, {
                        "type": "peer_left",
                        "user_id": user_id,
                        "room_id": room_id
                    })

                # 如果房间为空，删除房间
                if len(room["users"]) == 0:
                    del self.rooms[room_id]

        if user_id in self.users:
            self.users[user_id]["room_id"] = None
            self.users[user_id]["status"] = "online"

    async def call_user(self, from_user: str, to_user: str, offer: dict):
        """直接呼叫用户"""
        # 检查目标用户是否在线
        if to_user not in self.users or self.users[to_user]["status"] != "online":
            return {"success": False, "message": "用户不在线或忙碌中"}

        call_id = str(uuid.uuid4())
        self.pending_calls[call_id] = {"from": from_user, "to": to_user, "offer": offer}

        await self.send_to_user(to_user, {
            "type": "incoming_call",
            "call_id": call_id,
            "from": from_user,
            "offer": offer
        })

        self.users[from_user]["status"] = "calling"
        self.users[to_user]["status"] = "receiving_call"

        return {"success": True, "call_id": call_id}

    async def answer_call(self, call_id: str, accept: bool, answer: dict = None):
        if call_id not in self.pending_calls:
            return {"success": False, "message": "呼叫不存在"}

        call = self.pending_calls[call_id]
        from_user = call["from"]
        to_user = call["to"]

        if accept and answer:
            await self.send_to_user(from_user, {
                "type": "call_accepted",
                "call_id": call_id,
                "from": to_user,
                "answer": answer
            })
            self.users[from_user]["status"] = "busy"
            self.users[to_user]["status"] = "busy"
        else:
            await self.send_to_user(from_user, {
                "type": "call_rejected",
                "call_id": call_id,
                "from": to_user
            })
            self.users[from_user]["status"] = "online"
            self.users[to_user]["status"] = "online"

        del self.pending_calls[call_id]
        return {"success": True}

    def get_online_users(self, exclude_user: str = None):
        """获取在线用户列表"""
        online_users = []
        for user_id, user_info in self.users.items():
            if user_id != exclude_user and user_info["status"] == "online":
                online_users.append({
                    "id": user_id,
                    "status": user_info["status"]
                })
        return online_users

manager = ConnectionManager()


# WebSocket 连接
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect_user(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "ice_candidate":
                target = message.get("target")
                if target:
                    await manager.send_to_user(target, {
                        "type": "ice_candidate",
                        "candidate": message["candidate"],
                        "from": user_id
                    })

            elif message["type"] == "answer":
                if "call_id" in message:
                    await
                    manager.answer_call(
                        message["call_id"],
                        True,
                        message["answer"]
                    )
                else:
                    target = message.get("target")
                    if target:
                        await manager.send_to_user(target, {
                            "type": "answer",
                            "answer": message["answer"],
                            "from": user_id
                        })

    except WebSocketDisconnect:
        await manager.disconnect_user(user_id)
    except Exception as e:
        logger.error(f"WebSocket 错误: {e}")
        await
        manager.disconnect_user(user_id)


# HTTP API 端点
@app.post("/api/join-room")
async def join_room(request: JoinRoomRequest):
    """加入房间 API"""
    result = await
    manager.join_room(
        request.userId,
        request.roomId,
        request.offer.dict()
    )
    return result

@app.post("/api/call-user")
async def call_user(request: CallUserRequest):
    """呼叫用户 API"""
    result = await
    manager.call_user(
        request.from_user,
        request.to,
        request.offer.dict()
    )
    return result

@app.post("/api/answer-call")
async def answer_call(request: AnswerRequest):
    """应答呼叫 API"""
    call_id = request.dict().get("call_id")
    accept = request.dict().get("accept", True)
    answer = request.answer.dict() if request.answer else None

    result = await manager.answer_call(call_id, accept, answer)
    return result

@app.get("/api/online-users/{user_id}")
async def get_online_users(user_id: str):
    users = manager.get_online_users(exclude_user=user_id)
    return {"users": users}

@app.get("/api/user-status/{user_id}")
async def get_user_status(user_id: str):
    if user_id in manager.users:
        return {"status": manager.users[user_id]["status"]}
    else:
        return {"status": "offline"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
