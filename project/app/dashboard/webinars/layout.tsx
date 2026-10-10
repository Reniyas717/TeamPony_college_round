import type { ReactNode } from "react";
import { WebinarQueryProvider } from "./webinar-query-provider";

export default function WebinarLayout({ children }: { children: ReactNode }) {
  return <WebinarQueryProvider>{children}</WebinarQueryProvider>;
}
