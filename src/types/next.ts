// src/types/next.ts

/** 用于 Next.js App Router 的动态路由组件参数类型 (Next.js 15+) */
export interface PageProps<T extends Record<string, string> = Record<string, string>> {
  params: Promise<T>;
  searchParams?: Promise<Record<string, string | string[]>>;
}
