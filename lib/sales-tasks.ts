import { z } from "zod";
const optionalId=z.union([z.literal(""),z.string().uuid()]);
export const salesTaskInput=z.object({
 title:z.string().trim().min(1).max(120),
 person_id:optionalId,
 property_id:optionalId,
 task_type:z.enum(["follow_up","showing","owner_report","matching","other"]),
 showing_status:z.union([z.literal(""),z.enum(["requested","pending_confirmation","confirmed","completed","cancelled"])]),
 priority:z.enum(["low","normal","high"]),
 due_at:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
 notes:z.string().trim().max(2000)
}).refine(v=>Boolean(v.person_id||v.property_id),{message:"請選擇客戶或物件"});
export const taskTypeLabels:Record<string,string>={
 follow_up:"聯絡跟進", showing:"安排帶看", owner_report:"屋主回報", matching:"買方媒合", other:"其他"
};
export const showingStatusLabels:Record<string,string>={
 requested:"客戶提出帶看", pending_confirmation:"等待確認",confirmed:"雙方已確認",completed:"完成帶看",cancelled:"取消帶看"
};
