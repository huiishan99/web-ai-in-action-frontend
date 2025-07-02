# simple_server.py - 简化版 FastAPI 服务器，只处理房间模式
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from typing import Dict

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="简化版 WebRTC 信令服务器")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该指定具体域名
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


# 内存存储（生产环境应该用数据库）
class RoomManager:
    def __init__(self):
        # 房间数据结构: {room_id: {"users": [user1, user2], "offers": {user1: offer1, user2: offer2}}}
        self.rooms: Dict[str, Dict] = {}

    def join_room(self, room_id: str, user_id: str, offer: dict):
        """用户加入房间"""
        logger.info(f"用户 {user_id} 尝试加入房间 {room_id}")

        # 如果房间不存在，创建房间
        if room_id not in self.rooms:
            self.rooms[room_id] = {
                "users": [],
                "offers": {}
            }
            logger.info(f"创建新房间: {room_id}")

        room = self.rooms[room_id]

        # 检查房间是否已满（最多2人）
        if len(room["users"]) >= 2:
            logger.warning(f"房间 {room_id} 已满")
            return {"success": False, "message": "房间已满（最多2人）"}

        # 检查用户是否已在房间中
        if user_id in room["users"]:
            logger.warning(f"用户 {user_id} 已在房间 {room_id} 中")
            return {"success": False, "message": "您已在此房间中"}

        # 加入房间
        room["users"].append(user_id)
        room["offers"][user_id] = offer

        logger.info(f"用户 {user_id} 成功加入房间 {room_id}，当前人数: {len(room['users'])}")

        # 如果房间有2个人，返回匹配成功
        if len(room["users"]) == 2:
            user1, user2 = room["users"]
            other_user = user2 if user_id == user1 else user1
            other_offer = room["offers"][other_user]

            logger.info(f"房间 {room_id} 匹配成功: {user1} <-> {user2}")

            return {
                "success": True,
                "matched": True,
                "peer_id": other_user,
                "peer_offer": other_offer,
                "message": f"与 {other_user} 匹配成功"
            }
        else:
            return {
                "success": True,
                "matched": False,
                "waiting": True,
                "message": "等待其他用户加入"
            }

    def leave_room(self, room_id: str, user_id: str):
        """用户离开房间"""
        if room_id in self.rooms and user_id in self.rooms[room_id]["users"]:
            self.rooms[room_id]["users"].remove(user_id)
            if user_id in self.rooms[room_id]["offers"]:
                del self.rooms[room_id]["offers"][user_id]

            # 如果房间空了，删除房间
            if len(self.rooms[room_id]["users"]) == 0:
                del self.rooms[room_id]
                logger.info(f"删除空房间: {room_id}")

            logger.info(f"用户 {user_id} 离开房间 {room_id}")

    def get_room_info(self, room_id: str):
        """获取房间信息"""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            return {
                "room_id": room_id,
                "users": room["users"],
                "user_count": len(room["users"])
            }
        return None

    def get_all_rooms(self):
        """获取所有房间信息（用于调试）"""
        rooms_info = []
        for room_id, room in self.rooms.items():
            rooms_info.append({
                "room_id": room_id,
                "users": room["users"],
                "user_count": len(room["users"])
            })
        return rooms_info


# 创建房间管理器实例
room_manager = RoomManager()


# API 端点
@app.get("/")
async def root():
    """健康检查"""
    return {"message": "WebRTC 信令服务器运行中", "status": "ok"}


@app.post("/api/join-room")
async def join_room(request: JoinRoomRequest):
    """加入房间 API"""
    try:
        logger.info(f"收到加入房间请求: {request.userId} -> {request.roomId}")

        result = room_manager.join_room(
            request.roomId,
            request.userId,
            request.offer.model_dump()
        )

        logger.info(f"加入房间结果: {result}")
        return result

    except Exception as e:
        logger.error(f"加入房间失败: {e}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

@app.get("/api/rooms")
async def get_all_rooms():
    """获取所有房间信息（调试用）"""
    return {"rooms": room_manager.get_all_rooms(), "total_rooms": len(room_manager.rooms)}

@app.get("/api/online-users/{user_id}")
async def get_online_users(user_id: str):
    return {"users": [], "message": "服务器连接正常"}
@app.delete("/api/leave-room/{room_id}/{user_id}")
async def leave_room(room_id: str, user_id: str):
    """离开房间 API"""
    try:
        room_manager.leave_room(room_id, user_id)
        return {"success": True, "message": f"用户 {user_id} 已离开房间 {room_id}"}
    except Exception as e:
        logger.error(f"离开房间失败: {e}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")


@app.get("/api/room/{room_id}")
async def get_room_info(room_id: str):
    """获取房间信息"""
    room_info = room_manager.get_room_info(room_id)
    if room_info:
        return room_info
    else:
        raise HTTPException(status_code=404, detail="房间不存在")



@app.delete("/api/reset-rooms")
async def reset_all_rooms():
    """重置所有房间（调试用）"""
    rooms = room_manager.rooms
    room_count = len(rooms)
    rooms.clear()
    print(f"🧹 已清空所有房间，共清理了 {room_count} 个房间")
    return {"success": True, "message": f"已清空 {room_count} 个房间", "rooms_cleared": room_count}

@app.delete("/api/reset-room/{room_id}")
async def reset_single_room(room_id: str):
    """重置指定房间"""
    rooms = room_manager.rooms
    if room_id in rooms:
        del rooms[room_id]
        print(f"🧹 已清空房间: {room_id}")
        return {"success": True, "message": f"已清空房间 {room_id}"}
    else:
        return {"success": False, "message": f"房间 {room_id} 不存在"}

if __name__ == "__main__":
    import uvicorn

    print("🚀 启动 WebRTC 信令服务器...")
    print("📡 服务地址: http://localhost:8000")
    print("📋 API 文档: http://localhost:8000/docs")
    print("🏠 测试房间功能即可开始使用")
    uvicorn.run(app, host="0.0.0.0", port=8000)