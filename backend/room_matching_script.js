//room_matching_script.js

const { MongoClient } = require('mongodb');
const { requireMongoUri } = require('../src/lib/mongodb-config.cjs');

// MongoDB Atlas连接配置
const DB_NAME = 'room_matching_db';
const COLLECTION_NAME = 'rooms';

class RoomMatcher {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
    }

    // 连接MongoDB
    async connect() {
        const MONGO_URI = requireMongoUri();
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



    // 创建向量搜索索引
    async createVectorIndex() {
        try {
            const indexName = 'room_vector_index';

            // 检查索引是否已存在
            console.log('🔍 检查向量索引是否存在...');

            let indexes = [];
            try {
                indexes = await this.collection.listSearchIndexes().toArray();
                console.log(`找到 ${indexes.length} 个搜索索引`);
            } catch (error) {
                console.log('获取索引列表时出错:', error.message);
            }

            const existingIndex = indexes.find(idx => idx.name === indexName);

            if (existingIndex) {
                console.log(`✅ 向量索引 "${indexName}" 已存在，状态: ${existingIndex.status || 'UNKNOWN'}`);
                return;
            }

            console.log('⚠️ 向量索引不存在，请在Atlas控制台手动创建');
            console.log('索引配置:');
            console.log(JSON.stringify({
                name: indexName,
                fields: [
                    {
                        type: "vector",
                        path: "featureVector",
                        numDimensions: 4,
                        similarity: "cosine"
                    }
                ]
            }, null, 2));

        } catch (error) {
            console.error('❌ 检查向量索引时出错:', error.message);
            // 不抛出错误，继续执行
        }
    }

    // 匹配房间的核心函数
    async matchRoom(userSentiment, userHobbies) {
        try {
            // 构建用户向量
            const userVector = [userSentiment, ...userHobbies];

            console.log(`🔍 用户向量: [${userVector.join(', ')}]`);

            // 使用和simple_test_script完全相同的pipeline
            const pipeline = [
                {
                    $vectorSearch: {
                        index: "room_vector_index",
                        path: "featureVector",
                        queryVector: userVector,
                        numCandidates: 10,
                        limit: 3 // 获取前3个结果用于调试
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

            console.log('执行向量搜索pipeline...');
            const allResults = await this.collection.aggregate(pipeline).toArray();
            console.log(`向量搜索返回 ${allResults.length} 个结果`);

            // 手动过滤active的房间
            const activeResults = allResults.filter(room => room.isActive === true);
            console.log(`过滤后活跃房间: ${activeResults.length} 个`);

            if (allResults.length > 0) {
                console.log('所有结果:');
                allResults.forEach((result, index) => {
                    console.log(`  ${index + 1}. ${result.roomName}: active=${result.isActive}, score=${result.matchScore?.toFixed(4)}`);
                });
            }

            if (activeResults.length > 0) {
                // 返回第一个活跃房间
                return activeResults[0];
            } else {
                throw new Error('没有找到活跃的匹配房间');
            }

        } catch (error) {
            console.error('❌ 房间匹配失败详细信息:', error.message);
            console.error('错误堆栈:', error.stack);
            throw error;
        }
    }

    // 测试不同的用户场景
    async testMatching() {
        console.log('\n🧪 开始测试房间匹配...\n');

        // 只测试一个用户
        const testCase = {
            name: '开心的音乐爱好者',
            sentiment: 0.8,
            hobbies: [0.9, 0.2, 0.3],
            expected: 'KTV'
        };

        try {
            console.log(`👤 测试用户: ${testCase.name}`);
            console.log(`   情绪值: ${testCase.sentiment}`);
            console.log(`   爱好偏好: [${testCase.hobbies.join(', ')}]`);

            const result = await this.matchRoom(testCase.sentiment, testCase.hobbies);

            console.log(`✅ 匹配结果: ${result.roomName} (${result.roomType})`);
            console.log(`   匹配分数: ${result.matchScore.toFixed(3)}`);
            console.log(`   房间状态: ${result.currentUsers}/${result.maxCapacity}人\n`);

        } catch (error) {
            console.error(`❌ 测试失败: ${testCase.name} - ${error.message}`);
        }
    }

    // 关闭连接
    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('✅ MongoDB连接已关闭');
        }
    }
}

// 主函数
async function main() {
    const matcher = new RoomMatcher();

    try {
        // 1. 连接数据库
        await matcher.connect();


        // 4. 测试匹配功能
        await matcher.testMatching();

        console.log('\n✨ 测试完成');

    } catch (error) {
        console.error('❌ 程序执行失败:', error);
    } finally {
        // 5. 关闭连接
        await matcher.disconnect();
    }
}

// 导出类和主函数
module.exports = { RoomMatcher, main };

// 如果直接运行此文件，执行主函数
if (require.main === module) {
    main().catch(console.error);
}