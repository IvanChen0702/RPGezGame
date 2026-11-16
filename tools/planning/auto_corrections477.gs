/** Add as a NEW .gs file in the existing planning spreadsheet's Apps Script project.
 * Run applyPlanningCorrections477 once. No web-app deployment required.
 * Optional read-only preview: previewPlanningCorrections477.
 * Updates only the approved 44 dialogue Text cells and 3 flag configuration keys.
 * No network calls, planning publication, triggers, rewards or player data changes.
 * Close spreadsheet editors while applying; script locks cannot lock human edits.
 * Apps Script cell writes are not atomic. Backup is made first; retry is idempotent.
 */
const PLANNING_CORRECTIONS477 = {
  "dialogues": [
    {
      "DialogueID": "xi_secret_1_offer_3",
      "QuestID": "xi_secret_1",
      "before": "先帶指定魔攻武器給我。要能交付的，我會拆開研究。",
      "Text": "先帶 1 把聚魂法杖給我。要能交付的，交出去就不會退還；我會拆開研究。"
    },
    {
      "DialogueID": "xi_secret_2_offer_0",
      "QuestID": "xi_secret_2",
      "before": "接著是兩種指定王關寶石，各一顆。",
      "Text": "接著交給我地獄魔人寶石、地獄犬寶石各 1 顆。兩種都要，別拿兩顆一樣的來考驗我的耐心。"
    },
    {
      "DialogueID": "xi_secret_3_offer_0",
      "QuestID": "xi_secret_3",
      "before": "去討伐個幾隻指定魔法系怪物。",
      "Text": "接下委託後，討伐龍紋祭司 5 隻。這次除了打贏，也記一下牠們施法的節奏。"
    },
    {
      "DialogueID": "xi_secret_4_offer_0",
      "QuestID": "xi_secret_4",
      "before": "這次研究需要指定魔攻武器，拿來當作參考。",
      "Text": "這次交給我 1 本不死王秘典，當作研究材料。交付後會消耗，先把你自己要用的留好。"
    },
    {
      "DialogueID": "xi_secret_4_offer_1",
      "QuestID": "xi_secret_4",
      "before": "終於不用拆了。",
      "Text": "連書都收走？我以為這次只是借妳看。"
    },
    {
      "DialogueID": "xi_secret_4_offer_2",
      "QuestID": "xi_secret_4",
      "before": "你很失望嗎？我可以調整。",
      "Text": "我會做很多筆記。寫完以後，原作者可能也認不出來。"
    },
    {
      "DialogueID": "xi_secret_4_offer_3",
      "QuestID": "xi_secret_4",
      "before": "完全沒有。",
      "Text": "那我先確認沒把常用的那本交出去。"
    },
    {
      "DialogueID": "xi_secret_4_offer_4",
      "QuestID": "xi_secret_4",
      "before": "實際體會一次，會比較清楚魔力經過哪裡。",
      "Text": "很好。研究要動腦，交材料也一樣。"
    },
    {
      "DialogueID": "xi_secret_4_complete_0",
      "QuestID": "xi_secret_4",
      "before": "做得不錯。手給我，看看有沒有燙傷。",
      "Text": "秘典收到了。這幾頁的魔力痕跡正好能用來對照。"
    },
    {
      "DialogueID": "xi_secret_4_complete_1",
      "QuestID": "xi_secret_4",
      "before": "……我只是希望最後一課能準時開始。",
      "Text": "……不是我迫不及待，只是最後一課最好準時開始。"
    },
    {
      "DialogueID": "xi_secret_5_offer_0",
      "QuestID": "xi_secret_5",
      "before": "最後，擊敗指定BOSS 2次。",
      "Text": "最後，接下委託後擊敗深淵海皇・涅普提斯 2 次。"
    },
    {
      "DialogueID": "xi_secret_5_offer_2",
      "QuestID": "xi_secret_5",
      "before": "第一次可能靠運氣，第二次可能剛好。第三次，你應該能告訴我自己怎麼贏的。",
      "Text": "第一次算，但第二次要讓我看出你知道自己怎麼贏的。不能每次都把答案寫成運氣。"
    },
    {
      "DialogueID": "xi_secret_5_offer_3",
      "QuestID": "xi_secret_5",
      "before": "當然，你也可以連續幸運三次。我會稍微嫉妒。",
      "Text": "當然，你也可以連續幸運兩次。我會稍微嫉妒。"
    },
    {
      "DialogueID": "kazama_secret_1_offer_5",
      "QuestID": "kazama_secret_1",
      "before": "先帶指定物攻武器過來，交給我當教具。我們從重心和出手開始。",
      "Text": "先交給我 1 把處刑巨斧當教具，交付後不會退還。我們從重心和出手開始。"
    },
    {
      "DialogueID": "kazama_secret_2_offer_0",
      "QuestID": "kazama_secret_2",
      "before": "去討伐個幾隻指定近戰怪物，留意自己什麼時候開始急。",
      "Text": "接下委託後，討伐零域守衛 5 隻。留意自己什麼時候開始急。"
    },
    {
      "DialogueID": "kazama_secret_3_offer_0",
      "QuestID": "kazama_secret_3",
      "before": "任一\"武器\"成功強化三次。",
      "Text": "接下委託後，武器成功強化累計 3 次。不一定要同一把，失敗不算，別把它哭成成功。"
    },
    {
      "DialogueID": "kazama_secret_5_offer_0",
      "QuestID": "kazama_secret_5",
      "before": "最後，擊敗指定BOSS三次，活著回來找我。",
      "Text": "最後，接下委託後擊敗龍城女帝 3 次，活著回來找我。"
    },
    {
      "DialogueID": "yexian_secret_1_offer_7",
      "QuestID": "yexian_secret_1",
      "before": "帶指定物攻、魔攻裝備各一件，選你願意交付的。",
      "Text": "交給我深淵珊瑚刃、墜星軍刀各 1 把。兩種都要，交付後會消耗，選你願意交出的。"
    },
    {
      "DialogueID": "yexian_secret_2_offer_0",
      "QuestID": "yexian_secret_2",
      "before": "下一步，指定寶石2顆。",
      "Text": "下一步，交付龍王寶石、不死王寶石各 1 顆。不是任選兩顆。"
    },
    {
      "DialogueID": "yexian_secret_3_offer_0",
      "QuestID": "yexian_secret_3",
      "before": "指定近戰、魔法系怪物各5隻。觀察牠們怎麼抓距離，什麼時候追、什麼時候退。",
      "Text": "接下委託後，討伐星軌處刑者、重力巨神各 5 隻。觀察牠們怎麼抓距離，什麼時候追、什麼時候退。"
    },
    {
      "DialogueID": "yexian_secret_4_offer_0",
      "QuestID": "yexian_secret_4",
      "before": "完成一次裝備強化，再鑲嵌一顆寶石。有不清楚的先問。",
      "Text": "接下委託後，嘗試裝備強化 1 次，再完成寶石鑲嵌 1 次。強化不要求成功，也不限制部位；有不清楚的先問。"
    },
    {
      "DialogueID": "yexian_secret_5_offer_0",
      "QuestID": "yexian_secret_5",
      "before": "最後，開始兩位指定BOSS挑戰。",
      "Text": "最後，接下委託後擊敗龍城女帝 5 次、星蝕觀測者・阿斯特拉 1 次。兩個目標都要完成。"
    },
    {
      "DialogueID": "yexian_secret_5_complete_0",
      "QuestID": "yexian_secret_5",
      "before": "第二次那一步，退得不錯。",
      "Text": "女帝那幾場的步伐穩多了，對上觀測者也沒有亂掉。"
    },
    {
      "DialogueID": "lily_enhance_offer_5",
      "QuestID": "lily_enhance",
      "before": "好啦，不鬧你。這五顆強化石拿去，先試著強化一次\"武器\"。",
      "Text": "好啦，不鬧你。接受委託後這五顆強化石拿去，試著強化任一把武器 1 次；成功或失敗都算，別跑去強化帽子。"
    },
    {
      "DialogueID": "lily_socket_offer_4",
      "QuestID": "lily_socket",
      "before": "鑲上去能加十點HP。去鑲嵌介面，挑好位置再放。",
      "Text": "鑲上去能加十點 HP。接受委託後，替任一件裝備鑲嵌寶石 1 次就算完成；這顆拿去用，別拿來當糖吃。"
    },
    {
      "DialogueID": "xi_secret_1_progress_0",
      "QuestID": "xi_secret_1",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "交付聚魂法杖 1 把。我等材料，不是在等你跟貓聊天。"
    },
    {
      "DialogueID": "xi_secret_2_progress_0",
      "QuestID": "xi_secret_2",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "交付地獄魔人寶石、地獄犬寶石各 1 顆。我等材料，不是在等你跟貓聊天。"
    },
    {
      "DialogueID": "xi_secret_3_progress_0",
      "QuestID": "xi_secret_3",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "接取後討伐龍紋祭司 5 隻。我等材料，不是在等你跟貓聊天。"
    },
    {
      "DialogueID": "xi_secret_4_progress_0",
      "QuestID": "xi_secret_4",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "交付不死王秘典 1 本。我等材料，不是在等你跟貓聊天。"
    },
    {
      "DialogueID": "xi_secret_5_progress_0",
      "QuestID": "xi_secret_5",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "接取後擊敗深淵海皇・涅普提斯 2 次。我等材料，不是在等你跟貓聊天。"
    },
    {
      "DialogueID": "kazama_secret_1_progress_0",
      "QuestID": "kazama_secret_1",
      "before": "卡在哪裡？說來聽聽。你不講，我就只能猜你想來陪我聊天。",
      "Text": "交付處刑巨斧 1 把。先看清楚，別練得很認真，項目卻不對！"
    },
    {
      "DialogueID": "kazama_secret_2_progress_0",
      "QuestID": "kazama_secret_2",
      "before": "卡在哪裡？說來聽聽。你不講，我就只能猜你想來陪我聊天。",
      "Text": "接取後討伐零域守衛 5 隻。先看清楚，別練得很認真，項目卻不對！"
    },
    {
      "DialogueID": "kazama_secret_3_progress_0",
      "QuestID": "kazama_secret_3",
      "before": "卡在哪裡？說來聽聽。你不講，我就只能猜你想來陪我聊天。",
      "Text": "接取後武器成功強化累計 3 次。先看清楚，別練得很認真，項目卻不對！"
    },
    {
      "DialogueID": "kazama_secret_4_progress_0",
      "QuestID": "kazama_secret_4",
      "before": "卡在哪裡？說來聽聽。你不講，我就只能猜你想來陪我聊天。",
      "Text": "完成競技場對戰結算 3 次，不限勝負；先前已累積的任務進度保留。先看清楚，別練得很認真，項目卻不對！"
    },
    {
      "DialogueID": "kazama_secret_5_progress_0",
      "QuestID": "kazama_secret_5",
      "before": "卡在哪裡？說來聽聽。你不講，我就只能猜你想來陪我聊天。",
      "Text": "接取後擊敗龍城女帝 3 次。先看清楚，別練得很認真，項目卻不對！"
    },
    {
      "DialogueID": "yexian_secret_1_progress_0",
      "QuestID": "yexian_secret_1",
      "before": "卡住就說卡在哪裡。點頭裝懂，通常要多走一趟。",
      "Text": "交付深淵珊瑚刃、墜星軍刀各 1 把。一項一項來，別急著證明自己看得很快。"
    },
    {
      "DialogueID": "yexian_secret_2_progress_0",
      "QuestID": "yexian_secret_2",
      "before": "卡住就說卡在哪裡。點頭裝懂，通常要多走一趟。",
      "Text": "交付龍王寶石、不死王寶石各 1 顆。一項一項來，別急著證明自己看得很快。"
    },
    {
      "DialogueID": "yexian_secret_3_progress_0",
      "QuestID": "yexian_secret_3",
      "before": "卡住就說卡在哪裡。點頭裝懂，通常要多走一趟。",
      "Text": "接取後討伐星軌處刑者、重力巨神各 5 隻。一項一項來，別急著證明自己看得很快。"
    },
    {
      "DialogueID": "yexian_secret_4_progress_0",
      "QuestID": "yexian_secret_4",
      "before": "卡住就說卡在哪裡。點頭裝懂，通常要多走一趟。",
      "Text": "接取後嘗試任意裝備強化 1 次、完成寶石鑲嵌 1 次；強化不限成功。一項一項來，別急著證明自己看得很快。"
    },
    {
      "DialogueID": "yexian_secret_5_progress_0",
      "QuestID": "yexian_secret_5",
      "before": "卡住就說卡在哪裡。點頭裝懂，通常要多走一趟。",
      "Text": "接取後擊敗龍城女帝 5 次、星蝕觀測者・阿斯特拉 1 次。一項一項來，別急著證明自己看得很快。"
    },
    {
      "DialogueID": "lily_partner_progress_0",
      "QuestID": "lily_partner",
      "before": "有哪裡不懂就問。站在這裡看我，不會自己完成喔。",
      "Text": "通關主線第 5 層；已經通過也算。記不住就看任務目標，別把我當會走路的記事本。"
    },
    {
      "DialogueID": "lily_enhance_progress_0",
      "QuestID": "lily_enhance",
      "before": "有哪裡不懂就問。站在這裡看我，不會自己完成喔。",
      "Text": "接取後嘗試武器強化 1 次，成功或失敗都算。記不住就看任務目標，別把我當會走路的記事本。"
    },
    {
      "DialogueID": "lily_socket_progress_0",
      "QuestID": "lily_socket",
      "before": "有哪裡不懂就問。站在這裡看我，不會自己完成喔。",
      "Text": "接取後替任意裝備鑲嵌寶石 1 次。記不住就看任務目標，別把我當會走路的記事本。"
    },
    {
      "DialogueID": "xi_research_progress_0",
      "QuestID": "xi_research",
      "before": "缺材料就找材料，缺休息就去休息。弄錯順序通常比較花時間。",
      "Text": "交付天然手環、天然戒指各 1 件。我等材料，不是在等你跟貓聊天。"
    }
  ],
  "objectives": [
    {
      "ObjectiveID": "lily_partner_1",
      "QuestID": "lily_partner",
      "Type": "main_clear",
      "TargetID": 5.0,
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "lily_enhance_1",
      "QuestID": "lily_enhance",
      "Type": "enhance",
      "TargetID": null,
      "Quantity": 1.0,
      "Slot": "weapon",
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "lily_socket_1",
      "QuestID": "lily_socket",
      "Type": "socket",
      "TargetID": null,
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_research_1",
      "QuestID": "xi_research",
      "Type": "deliver_equipment",
      "TargetID": "naturalBracelet",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_research_2",
      "QuestID": "xi_research",
      "Type": "deliver_equipment",
      "TargetID": "naturalRing",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_1_1",
      "QuestID": "xi_secret_1",
      "Type": "deliver_equipment",
      "TargetID": "soulStaff",
      "Quantity": 1.0,
      "Slot": "weapon",
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_2_1",
      "QuestID": "xi_secret_2",
      "Type": "deliver_gem",
      "TargetID": "hellDemon",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_2_2",
      "QuestID": "xi_secret_2",
      "Type": "deliver_gem",
      "TargetID": "hellHound",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_3_1",
      "QuestID": "xi_secret_3",
      "Type": "kill",
      "TargetID": "dragonPriest",
      "Quantity": 5.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_4_1",
      "QuestID": "xi_secret_4",
      "Type": "deliver_equipment",
      "TargetID": "azraelGrimoire",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "xi_secret_5_1",
      "QuestID": "xi_secret_5",
      "Type": "kill",
      "TargetID": "boss70",
      "Quantity": 2.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "kazama_secret_1_1",
      "QuestID": "kazama_secret_1",
      "Type": "deliver_equipment",
      "TargetID": "executionerAxe",
      "Quantity": 1.0,
      "Slot": "weapon",
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "kazama_secret_2_1",
      "QuestID": "kazama_secret_2",
      "Type": "kill",
      "TargetID": "nullGuard",
      "Quantity": 5.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "kazama_secret_3_1",
      "QuestID": "kazama_secret_3",
      "Type": "enhance_success",
      "TargetID": null,
      "Quantity": 3.0,
      "Slot": "weapon",
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "kazama_secret_4_1",
      "QuestID": "kazama_secret_4",
      "Type": "battle",
      "TargetID": "arena",
      "Quantity": 3.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "kazama_secret_5_1",
      "QuestID": "kazama_secret_5",
      "Type": "kill",
      "TargetID": "boss50",
      "Quantity": 3.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_1_1",
      "QuestID": "yexian_secret_1",
      "Type": "deliver_equipment",
      "TargetID": "abyssCoralBlade",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_1_2",
      "QuestID": "yexian_secret_1",
      "Type": "deliver_equipment",
      "TargetID": "starfallSaber",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_2_1",
      "QuestID": "yexian_secret_2",
      "Type": "deliver_gem",
      "TargetID": "dragonKing",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_2_2",
      "QuestID": "yexian_secret_2",
      "Type": "deliver_gem",
      "TargetID": "undeadKing",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_3_1",
      "QuestID": "yexian_secret_3",
      "Type": "kill",
      "TargetID": "astralExecutioner",
      "Quantity": 5.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_3_2",
      "QuestID": "yexian_secret_3",
      "Type": "kill",
      "TargetID": "gravityTitan",
      "Quantity": 5.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_4_1",
      "QuestID": "yexian_secret_4",
      "Type": "enhance",
      "TargetID": null,
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_4_2",
      "QuestID": "yexian_secret_4",
      "Type": "socket",
      "TargetID": null,
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_5_1",
      "QuestID": "yexian_secret_5",
      "Type": "kill",
      "TargetID": "boss50",
      "Quantity": 5.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    },
    {
      "ObjectiveID": "yexian_secret_5_2",
      "QuestID": "yexian_secret_5",
      "Type": "kill",
      "TargetID": "boss80",
      "Quantity": 1.0,
      "Slot": null,
      "MinEnhance": 0.0,
      "Enabled": null
    }
  ],
  "flags": [
    {
      "Key": "FlagScoreMinutes",
      "Value": 180,
      "Description": "每面旗幟存續計分週期（分鐘）"
    },
    {
      "Key": "FlagScorePoints",
      "Value": 1,
      "Description": "每面旗幟每期積分"
    },
    {
      "Key": "RemoveEnemyFlagPoints",
      "Value": 3,
      "Description": "拔除敵方旗幟積分"
    }
  ]
};
function planningBook477_(){
 const book=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet();
 if(!book)throw Error('找不到企劃試算表，請從目前的企劃表開啟 Apps Script。');
 return book;
}
function planningRead477_(book,name,required){
 const sheet=book.getSheetByName(name);if(!sheet)throw Error('缺少工作表：'+name);
 const range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas();
 const headers=values[0].map(x=>String(x).trim());
 for(const key of required)if(headers.filter(h=>h===key).length!==1)throw Error(name+' 欄位缺少或重複：'+key);
 return {sheet,name,values,formulas,headers};
}
function planningPlan477_(book){
 const spec=PLANNING_CORRECTIONS477,changes=[],append=[],conflicts=[];
 const d=planningRead477_(book,'QuestDialogues',['DialogueID','QuestID','Text']);
 const o=planningRead477_(book,'QuestObjectives',['ObjectiveID','QuestID','Type','TargetID','Quantity','Slot','MinEnhance']);
 const c=planningRead477_(book,'MistConfig',['Key','Value']);
 const object=(t,row)=>Object.fromEntries(t.headers.map((h,i)=>[h,row[i]]));
 const questIds=new Set(spec.dialogues.map(r=>r.QuestID));
 const normalize=r=>{
  const out={};for(const key of ['ObjectiveID','QuestID','Type','TargetID','Quantity','Slot','MinEnhance','Enabled']){
   const v=r[key];out[key]=key==='Enabled'?!(v===false||String(v).toLowerCase()==='false'):['Quantity','MinEnhance'].includes(key)?Number(v||0):String(v??'');
  }return out;
 };
 const actual=o.values.slice(1).map(r=>object(o,r)).filter(r=>questIds.has(String(r.QuestID)));
 if(actual.length!==spec.objectives.length)conflicts.push('相關任務的條件數量已變更');
 for(const expected of spec.objectives){
  const rows=actual.filter(r=>String(r.ObjectiveID)===expected.ObjectiveID);
  if(rows.length!==1||JSON.stringify(normalize(rows[0]))!==JSON.stringify(normalize(expected)))conflicts.push('任務條件已變更或 ID 重複／缺少：'+expected.ObjectiveID);
 }
 let already=0;
 for(const p of spec.dialogues){
  const matches=d.values.map((r,i)=>i>0&&String(r[d.headers.indexOf('DialogueID')])===p.DialogueID?i:-1).filter(i=>i>0);
  if(matches.length!==1){conflicts.push('對話 ID 缺少或重複：'+p.DialogueID);continue;}
  const i=matches[0],col=d.headers.indexOf('Text'),value=d.values[i][col];
  if(String(d.values[i][d.headers.indexOf('QuestID')])!==p.QuestID){conflicts.push('對話所屬任務不同：'+p.DialogueID);continue;}
  if(d.formulas[i][col]){conflicts.push('對話文字由公式產生，未覆寫：'+p.DialogueID);continue;}
  if(value===p.Text){already++;continue;}
  if(value!==p.before){conflicts.push('已有其他對話修訂，未覆寫：'+p.DialogueID);continue;}
  changes.push({table:d,row:i+1,col:col+1,id:p.DialogueID,before:value,value:p.Text});
 }
 for(const p of spec.flags){
  const ki=c.headers.indexOf('Key'),vi=c.headers.indexOf('Value');
  const rows=c.values.map((r,i)=>i>0&&String(r[ki])===p.Key?i:-1).filter(i=>i>0);
  if(rows.length>1){conflicts.push('旗幟設定重複：'+p.Key);continue;}
  if(rows.length){if(c.formulas[rows[0]][vi]||Number(c.values[rows[0]][vi])!==p.Value)conflicts.push('旗幟設定已有不同值或公式：'+p.Key);continue;}
  append.push(c.headers.map(h=>p[h]??''));
 }
 const result={ok:!conflicts.length,spreadsheetId:book.getId(),spreadsheetName:book.getName(),dialoguesToUpdate:changes.length,dialoguesAlreadyUpdated:already,flagKeysToAdd:append.length,conflicts,published:false};
 return {result,changes,append,d,c,signature:JSON.stringify([d.values,d.formulas,o.values,o.formulas,c.values,c.formulas])};
}
function previewPlanningCorrections477(){
 const plan=planningPlan477_(planningBook477_());
 const result={...plan.result,preview:plan.changes.map(x=>({id:x.id,before:x.before,after:x.value}))};
 console.log(JSON.stringify(result));return result;
}
function applyPlanningCorrections477(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw Error('另一個維護作業正在執行，請稍後重試。');
 const backups=[];let wrote=0;
 try{
  const book=planningBook477_(),plan=planningPlan477_(book);
  if(!plan.result.ok)throw Error('尚未寫入：'+plan.result.conflicts.join('；'));
  if(!plan.changes.length&&!plan.append.length){console.log(JSON.stringify(plan.result));return plan.result;}
  const stamp=Utilities.formatDate(new Date(),'Asia/Taipei','yyyyMMdd_HHmmss')+'_'+Utilities.getUuid().slice(0,8);
  const tables=[...(plan.changes.length?[plan.d]:[]),...(plan.append.length?[plan.c]:[])];
  for(const t of tables){const backup=t.sheet.copyTo(book);backup.setName('_backup477_'+t.name+'_'+stamp);backups.push(backup.getName());}
  SpreadsheetApp.flush();
  if(planningPlan477_(book).signature!==plan.signature)throw Error('備份期間企劃內容改變，尚未寫入，請關閉其他編輯後重試。');
  for(const edit of plan.changes){
   const cell=edit.table.sheet.getRange(edit.row,edit.col);
   if(cell.getFormula()||cell.getValue()!==edit.before)throw Error('寫入前文字已變更：'+edit.id);
   cell.setValue(edit.value);wrote++;
  }
  if(plan.append.length){
   const sheet=plan.c.sheet,start=plan.c.values.length+1,end=start+plan.append.length-1;
   if(end>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),end-sheet.getMaxRows());
   sheet.getRange(start,1,plan.append.length,plan.c.headers.length).setValues(plan.append);wrote+=plan.append.length;
  }
  SpreadsheetApp.flush();
  const checked=planningPlan477_(book);
  if(!checked.result.ok||checked.changes.length||checked.append.length)throw Error('寫入後核對未通過，請保留備份與執行紀錄。');
  const result={...checked.result,updatedDialogues:plan.changes.length,addedFlagKeys:plan.append.length,backups,note:'企劃表已同步；未發布、未重設進度。可重複執行，不會重複修改。'};
  console.log(JSON.stringify(result));return result;
 }catch(error){
  console.error(JSON.stringify({ok:false,writesCompleted:wrote,backups,message:String(error.message||error),published:false}));
  throw error;
 }finally{lock.releaseLock();}
}
