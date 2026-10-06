export type AreaPage = {
  slug: string;
  name: string;
  shortName: string;
  eyebrow: string;
  headline: string;
  summary: string;
  description: string;
  propertyKeywords: string[];
  searchTerms: string[];
  audiences: string[];
  features: Array<{ title: string; description: string }>;
  cautions: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const areaPages: AreaPage[] = [
  {
    slug: "changhua-city",
    name: "彰化市",
    shortName: "彰化市",
    eyebrow: "Changhua City",
    headline: "彰化市買房、賣房與房屋土地資訊",
    summary: "從市區住宅、透天、店面到建地，依照生活圈、通勤需求與預算，協助您整理適合的方向。",
    description: "彰化市生活機能完整，住宅類型多元，也是北彰化自住、換屋與店面需求集中的區域。不同生活圈的屋齡、停車條件與價格差異明顯，看屋前先釐清通勤、學區及家庭空間需求，更容易找到適合的物件。",
    propertyKeywords: ["大樓", "透天", "店面", "建地"],
    searchTerms: ["彰化市"],
    audiences: ["希望兼顧生活機能與通勤的自住家庭", "準備換屋、需要較完整空間的家庭", "尋找市區店面、辦公或建地的買方"],
    features: [
      { title: "生活機能集中", description: "商圈、學校、醫療與日常採買選擇完整，適合重視便利性的家庭。" },
      { title: "住宅選擇多元", description: "從華廈、大樓、公寓到透天，可依預算、停車與電梯需求篩選。" },
      { title: "通勤選擇彈性", description: "可銜接台74線、國道與台鐵，往台中或彰化周邊鄉鎮皆方便。" }
    ],
    cautions: ["老屋應確認屋況、增建與修繕預算", "市區看屋要同步確認停車與進出動線", "建地與店面仍須個別確認使用分區、建築線及現況租約"],
    faqs: [
      { question: "彰化市適合先看大樓還是透天？", answer: "要看預算、家庭人數、是否需要電梯及可接受的屋齡。先把停車、房間數與通勤範圍排出優先順序，會比只看總價更有效率。" },
      { question: "買彰化市老屋要注意什麼？", answer: "除漏水、管線及結構外，也要確認增建、使用現況、停車方式與未來修繕費用，不要只看室內裝潢。" },
      { question: "彰化市不同生活圈價格會差很多嗎？", answer: "會。道路條件、屋齡、產品類型、學校與商圈距離都會影響價格，應以相近時間、相近產品的成交資料比較。" },
      { question: "屋主想出售彰化市房屋，可以先做什麼？", answer: "可先整理權狀、現況照片、屋況及貸款資料，再由阿勇協助盤點價格、費用與銷售方式。" }
    ]
  },
  {
    slug: "xiushui",
    name: "秀水鄉",
    shortName: "秀水",
    eyebrow: "Xiushui",
    headline: "秀水鄉買房、建地、農地與廠房資訊",
    summary: "鄰近彰化市、鹿港與和美，住宅、土地及產業型不動產各有不同的評估重點。",
    description: "秀水鄉兼具居住與產業需求，常見透天、建地、農地與廠房。選購時除了總價，也要留意道路、臨路寬度、使用分區、水電條件及實際通勤動線。",
    propertyKeywords: ["透天", "建地", "農地", "廠房"],
    searchTerms: ["秀水鄉", "秀水"],
    audiences: ["希望鄰近彰化市、又需要透天空間的家庭", "尋找建地、農地或廠房的買方", "在秀水有房地產、準備評估出售的屋主"],
    features: [
      { title: "北彰化移動便利", description: "往彰化市、鹿港與和美皆有生活與工作上的連結。" },
      { title: "土地產品多元", description: "住宅、建地、農地與產業使用需求並存，適合依用途精確篩選。" },
      { title: "空間選擇較充足", description: "相較市區，較容易找到重視土地、停車或工作空間的產品。" }
    ],
    cautions: ["土地應確認使用分區、臨路及建築線", "廠房應核對合法使用、水電與消防條件", "農地的使用、農舍資格及貸款條件要分別確認"],
    faqs: [
      { question: "秀水買透天最先要看什麼？", answer: "先確認生活動線、道路寬度、停車、屋況與增建情形，再比較總價與修繕成本。" },
      { question: "秀水建地都能直接蓋房子嗎？", answer: "不一定。仍須確認使用分區、建築線、臨路條件、地形與相關法規，不能只看謄本上寫建地。" },
      { question: "秀水廠房如何判斷是否適合？", answer: "要依實際用途確認土地與建物合法性、道路、裝卸動線、電力、消防及周邊環境。" },
      { question: "秀水房地產要出售，怎麼估價？", answer: "應依產品類型分開比較，透天、建地、農地及廠房不能用同一種單價邏輯判斷。" }
    ]
  },
  {
    slug: "lukang",
    name: "鹿港鎮",
    shortName: "鹿港",
    eyebrow: "Lukang",
    headline: "鹿港鎮房屋、店面與土地買賣資訊",
    summary: "從舊市區店面、住宅透天到外圍建地與農地，依用途與生活圈分析真正適合的選擇。",
    description: "鹿港鎮兼具居住、觀光、商業與產業需求。舊市區與外圍區域的道路、產品類型及價格判斷差異很大，買房或買地前應先確認用途，再比較適合的生活圈。",
    propertyKeywords: ["店面", "透天", "建地", "農地"],
    searchTerms: ["鹿港鎮", "鹿港"],
    audiences: ["希望在鹿港自住或換屋的家庭", "尋找店面、建地或土地的買方", "持有鹿港房屋或土地、準備出售的屋主"],
    features: [
      { title: "生活與商業兼具", description: "傳統生活圈、觀光商圈與在地就業需求，使物件用途更為多元。" },
      { title: "市區外圍差異明顯", description: "舊市區重視道路與停車，外圍土地則要留意分區、臨路及使用條件。" },
      { title: "店面土地各有市場", description: "自用、出租與長期持有的評估方式不同，需從用途出發比較。" }
    ],
    cautions: ["舊市區房屋要確認道路、停車、屋況與產權", "店面應核對現況租約、使用及人車動線", "土地應確認分區、臨路、建築線與是否有地上物"],
    faqs: [
      { question: "鹿港舊市區買房最常遇到什麼問題？", answer: "道路與停車條件、老屋修繕、增建及產權資料都很重要，應把實際使用便利性一起納入評估。" },
      { question: "鹿港店面可以只看租金報酬嗎？", answer: "不建議。還要確認租約、承租狀況、道路、人流、用途及未來維修成本。" },
      { question: "鹿港土地出價前要查什麼？", answer: "至少先確認地目與使用分區、臨路、建築線、地形、地上物及水電條件。" },
      { question: "鹿港物件出售前需要整理哪些資料？", answer: "可先準備權狀、謄本、稅單、租約與現況說明，再依住宅、店面或土地分別評估。" }
    ]
  }
];

export function getAreaPage(slug: string) {
  return areaPages.find((area) => area.slug === slug) || null;
}
