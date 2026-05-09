/**
 * AI 助手 - plan_operations 工具定义
 * @description AI 通过此工具提交写操作计划，前端展示给用户确认
 */

import { z } from "zod";
import { tool } from "ai";

/** 操作类型枚举 */
export const WriteOpType = {
  // 标签
  CREATE_TAG: "create_tag",
  UPDATE_TAG: "update_tag",
  DELETE_TAG: "delete_tag",
  REORDER_TAGS: "reorder_tags",
  // 网站
  CREATE_SITE: "create_site",
  UPDATE_SITE: "update_site",
  DELETE_SITE: "delete_site",
  BATCH_CREATE_SITES: "batch_create_sites",
  // 社交卡片
  CREATE_CARD: "create_card",
  UPDATE_CARD: "update_card",
  DELETE_CARD: "delete_card",
  // 笔记
  CREATE_NOTE: "create_note",
  UPDATE_NOTE: "update_note",
  DELETE_NOTE: "delete_note",
} as const;

export type WriteOpType = (typeof WriteOpType)[keyof typeof WriteOpType];

/** 操作计划中的单个操作 */
export type PlannedOperation = {
  type: WriteOpType;
  description: string;
  params: Record<string, unknown>;
};

/** 创建 plan_operations 工具 */
export function createPlanTool() {
  return {
    plan_operations: tool({
      description:
        "提交数据操作计划。当你需要对标签、网站、卡片或笔记执行增删改操作时，必须通过此工具提交计划，等待用户确认后才会执行。",
      inputSchema: z.object({
        summary: z.string().describe("本次操作的简要总结（一句话）"),
        operations: z
          .array(
            z.object({
              type: z
                .enum([
                  "create_tag",
                  "update_tag",
                  "delete_tag",
                  "reorder_tags",
                  "create_site",
                  "update_site",
                  "delete_site",
                  "batch_create_sites",
                  "create_card",
                  "update_card",
                  "delete_card",
                  "create_note",
                  "update_note",
                  "delete_note",
                ])
                .describe("操作类型"),
              description: z.string().describe("操作描述（中文，简洁明了）"),
              params: z.record(z.string(), z.unknown()).describe("操作参数"),
            }),
          )
          .min(1)
          .describe("计划执行的操作列表"),
      }),
      execute: async ({ summary, operations }) => {
        // 不执行任何数据变更，只是返回操作计划给前端展示
        return {
          planned: true,
          summary,
          operations,
          totalOperations: operations.length,
          message: `已规划 ${operations.length} 项操作，等待用户确认。`,
        };
      },
    }),
  };
}
