// app/api/room-matching/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 导入你的 RoomMatcher 类
// 注意：你需要将你的脚本转换为 ES6 模块或者适配 TypeScript
class RoomMatcher {
  private client: any;
  private db: any;
  private collection: any;

  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  async connect() {
    const { MongoClient } = require('mongodb');
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://haox5499:b7dALrb0yVGzG4bt@cluster0.8bbl3e9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const DB_NAME = 'room_matching_db';
    const COLLECTION_NAME = 'rooms';

    try {
      this.client = new MongoClient(MONGO_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      this.collection = this.db.collection(COLLECTION_NAME);
      console.log('✅ 连接MongoDB成功');
    } catch (error) {
      console.error('❌ 连接MongoDB失败:', error);
      throw error;
    }
  }

  async matchRoom(userSentiment: number, userHobbies: [number, number, number]) {
    try {
      const userVector = [userSentiment, ...userHobbies];
      console.log(`🔍 用户向量: [${userVector.join(', ')}]`);

      const pipeline = [
        {
          $vectorSearch: {
            index: "room_vector_index",
            path: "featureVector",
            queryVector: userVector,
            numCandidates: 10,
            limit: 3
          }
        },
        {
          $project: {
            roomId: 1,
            roomName: 1,
            roomType: 1,
            description: 1,
            maxCapacity: 1,
            currentUsers: 1,
            isActive: 1,
            matchScore: { $meta: "vectorSearchScore" }
          }
        }
      ];

      const allResults = await this.collection.aggregate(pipeline).toArray();
      const activeResults = allResults.filter((room: any) => room.isActive === true);

      if (activeResults.length > 0) {
        return activeResults[0];
      } else {
        throw new Error('没有找到活跃的匹配房间');
      }
    } catch (error) {
      console.error('❌ 房间匹配失败:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB连接已关闭');
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sentiment, hobbies } = body;

    // 验证输入参数
    if (typeof sentiment !== 'number' || !Array.isArray(hobbies) || hobbies.length !== 3) {
      return NextResponse.json(
        { error: '无效的参数格式' },
        { status: 400 }
      );
    }

    // 创建房间匹配器实例
    const matcher = new RoomMatcher();

    try {
      // 连接数据库
      await matcher.connect();

      // 执行房间匹配
      const result = await matcher.matchRoom(sentiment, hobbies as [number, number, number]);

      // 返回匹配结果
      return NextResponse.json({
        success: true,
        ...result
      });

    } finally {
      // 确保连接被关闭
      await matcher.disconnect();
    }

  } catch (error) {
    console.error('房间匹配API错误:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 可选：添加 GET 方法用于健康检查
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '房间匹配API运行正常'
  });
}