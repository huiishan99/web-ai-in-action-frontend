// src/types/next.ts

/** 用于 Next.js App Router 的动态路由组件参数类型 */
export interface PageProps<T extends Record<string, string> = Record<string, string>> {
  params: T;
  searchParams?: Record<string, string | string[]>;
}
