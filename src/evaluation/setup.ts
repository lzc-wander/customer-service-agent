// src/evaluation/setup.ts
import { fileURLToPath } from "node:url";
import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { customerServiceAgent } from "../agent";

const client = new Client();

const DATASET_NAME = "customer-service-eval";

const testCases = [
  {
    inputs: { question: "退货政策是什么？" },
    outputs: { keywords: ["7天", "未使用", "包装完好"] },
  },
  {
    inputs: { question: "如何查询订单？" },
    outputs: { keywords: ["订单号", "我的订单", "个人中心"] },
  },
  {
    inputs: { question: "物流多久能到？" },
    outputs: { keywords: ["运单号", "物流", "配送时间"] },
  },
];

async function ensureDataset() {
  // 检查数据集
  const exists = await client.hasDataset({ datasetName: DATASET_NAME });

  let dataset;
  if (exists) {
    dataset = await client.readDataset({ datasetName: DATASET_NAME });
    console.log(`✅ 复用数据集: ${DATASET_NAME}`);
  } else {
    dataset = await client.createDataset(DATASET_NAME, {
      description: "客服系统评估数据集",
    });
    console.log(`✅ 创建数据集: ${DATASET_NAME}`);
  }

  // 检查是否有示例，没有则追加
  const examples: AsyncIterable<import("langsmith").Example> = client.listExamples({
    datasetId: dataset.id,
  });
  let hasExamples = false;
  for await (const _ of examples) {
    hasExamples = true;
    break;
  }

  if (!hasExamples) {
    for (const tc of testCases) {
      await client.createExample({
        inputs: tc.inputs,
        outputs: tc.outputs,
        dataset_id: dataset.id,
      });
    }
    console.log(`✅ 添加了 ${testCases.length} 个评估用例`);
  } else {
    console.log(`✅ 数据集已有示例，跳过添加`);
  }

  return dataset;
}

// 运行评估
async function runEvaluation() {
  const results = await evaluate(
    async (inputs: any) => {
      const result = await customerServiceAgent.invoke(
        {
          messages: [{ role: "user", content: inputs.question }],
        },
        {
          configurable: {
            thread_id: `eval-${Math.random().toString(36).slice(2, 10)}`,
          },
        }
      );
      return { answer: result.messages.at(-1)?.content };
    },
    {
      data: DATASET_NAME,
      evaluators: [
        async ({ outputs, referenceOutputs }: { outputs: any; referenceOutputs?: any }) => {
          const answer = (outputs?.answer || "").toLowerCase();
          const keywords = referenceOutputs?.keywords || [];

          const matchedKeywords = keywords.filter((keyword: string) =>
            answer.includes(keyword.toLowerCase())
          );

          const score = matchedKeywords.length / keywords.length;

          return {
            key: "keyword_match",
            score,
            comment: `匹配了 ${matchedKeywords.length}/${keywords.length} 个关键词`,
          };
        },
      ],
    }
  );

  const rows = await results.results;
  const scores = rows
    .map(r => Number(r.evaluationResults?.results?.[0]?.score ?? 0));
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;
  console.log(`\n📊 评估报告：`);
  console.log(`平均得分：${avgScore.toFixed(2)}`);
  console.log(`测试用例数：${scores.length}`);

  return results;
}

// 执行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureDataset()
    .then(() => runEvaluation())
    .catch(console.error);
}
