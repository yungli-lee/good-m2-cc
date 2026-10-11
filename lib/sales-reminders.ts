export type SalesReminder={id:string;title:string;due_at:string;showing_at:string|null;person_id:string|null;property_id:string|null;notes:string|null};
const tz="Asia/Taipei";
export function formatTaipeiReminderDate(iso:string){
 return new Intl.DateTimeFormat("zh-TW",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(iso));
}
export function formatSalesLineReminder(row:SalesReminder,siteUrl:string){
 const lines=["🔔 勇美銷售跟進提醒",`任務：${row.title}`,`跟進：${formatTaipeiReminderDate(row.due_at)}`];
 if(row.showing_at)lines.push(`預定帶看：${formatTaipeiReminderDate(row.showing_at)}`);
 lines.push("請至後台確認並記錄處理結果。",`${siteUrl.replace(/\/$/,"")}/admin/sales-tasks`);
 return lines.join("\n").slice(0,5000);
}
export function shouldSendReminder(row:{status:string;due_at:string;line_reminder_sent_for:string|null},now:Date){
 return row.status==="open"&&Date.parse(row.due_at)<=now.getTime()&&row.line_reminder_sent_for!==row.due_at;
}
