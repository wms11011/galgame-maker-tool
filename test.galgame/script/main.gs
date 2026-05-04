@label(id: "n0_label", label: "★ 第一章入口", color: "#F0A060") {
}

@dialog(id: "n1_dialog", character: "旁白", label: "序幕：樱花盛开的季节") {
  content: "春天到了，樱花盛开。你作为转学生来到了这所学校。一段关于青春、友情与爱的故事即将展开……"
  background: "assets/backgrounds/sakura_tree.png"
  next: "n2_savePoint"
}

@savePoint(id: "n2_savePoint", slotLabel: "故事开始", label: "存档：开始") {
  next: "n3_setVariable"
}

@setVar(id: "n3_setVariable", var: "剧情进度", op: "=", value: "1", label: "初始化变量") {
  next: "n4_dialog"
}

@dialog(id: "n4_dialog", character: "旁白", label: "转学第一天") {
  content: "你走进教室，阳光透过窗户洒在课桌上。教室里已经有不少同学了。"
  background: "assets/backgrounds/ComfyUI_00001_.png"
  next: "n5_dialog"
}

@dialog(id: "n5_dialog", character: "小樱", label: "遇见小樱") {
  content: "你好呀！你是新来的转学生吧？我叫小樱，很高兴认识你！有什么需要帮忙的尽管说哦~"
  background: "assets/backgrounds/ComfyUI_ANMIE_00001_.png"
  next: "n6_setVariable"
}

@setVar(id: "n6_setVariable", var: "小樱好感度", op: "+=", value: "10", label: "小樱好感+10") {
  next: "n7_setVariable"
}

@setVar(id: "n7_setVariable", var: "小樱好感度", op: "+=", value: "5", label: "小樱好感+5") {
  next: "n8_setVariable"
}

@setVar(id: "n8_setVariable", var: "剧情进度", op: "+=", value: "1", label: "剧情+1") {
  next: "n9_choice"
}

@choice(id: "n9_choice", title: "小樱看起来很友善，你要怎么回应？", label: "第一次选择：如何回应？") {
  option("热情") { next: "n10_dialog" }
  option("腼腆") { next: "n14_dialog" }
  option("冷漠") { next: "n17_dialog" }
}

@dialog(id: "n10_dialog", character: "小樱", label: "热情回应") {
  content: "哈哈，你很开朗呢！来，我带你参观一下学校吧！"
  background: "assets/backgrounds/ComfyUI_ANMIE_00002_.png"
  next: "n11_setVariable"
}

@setVar(id: "n11_setVariable", var: "小樱好感度", op: "+=", value: "15", label: "小樱好感+15") {
  next: "n12_setVariable"
}

@setVar(id: "n12_setVariable", var: "勇气值", op: "+=", value: "20", label: "勇气+20") {
  next: "n13_setVariable"
}

@setVar(id: "n13_setVariable", var: "剧情进度", op: "+=", value: "2", label: "剧情+2") {
  next: "n20_goto"
}

@dialog(id: "n14_dialog", character: "小樱", label: "腼腆回应") {
  content: "不用害羞啦~ 大家都是同学。来，我帮你熟悉一下环境。"
  background: "assets/backgrounds/ComfyUI_ANMIE_00002_.png"
  next: "n15_setVariable"
}

@setVar(id: "n15_setVariable", var: "小樱好感度", op: "+=", value: "8", label: "小樱好感+8") {
  next: "n16_setVariable"
}

@setVar(id: "n16_setVariable", var: "勇气值", op: "+=", value: "5", label: "勇气+5") {
  next: "n20_goto"
}

@dialog(id: "n17_dialog", character: "小樱", label: "冷漠回应") {
  content: "（小声嘀咕）看来新同学不太爱说话呢...不过没关系，慢慢就会熟悉的。"
  background: "assets/backgrounds/ComfyUI_00008_.png"
  next: "n18_setVariable"
}

@setVar(id: "n18_setVariable", var: "小樱好感度", op: "+=", value: "2", label: "小樱好感+2") {
  next: "n19_setVariable"
}

@setVar(id: "n19_setVariable", var: "选择次数", op: "+=", value: "1", label: "选择次数+1") {
  next: "n20_goto"
}

@goto(id: "n20_goto", target: "★ 第二章：校园生活", label: "前往第二章") {
}

@label(id: "n21_label", label: "★ 第二章：校园生活", color: "#6BA4D8") {
}

@dialog(id: "n22_dialog", character: "旁白", label: "第二章开始") {
  content: "几周过去了，你逐渐适应了新的校园生活。今天有一场重要的随堂测验。"
  background: "assets/backgrounds/ComfyUI_00002_.png"
  next: "n23_audio"
}

@audio(id: "n23_audio", type: "bgm", action: "play", src: "assets/audio/classroom_bgm.mp3", loop: "true", volume: "1", label: "教室BGM") {
  next: "n24_animation"
}

@anim(id: "n24_animation", target: "screen", action: "enter", duration: "600", position: "right", label: "林老师入场") {
  next: "n25_moveCharacter"
}

@moveCharacter(id: "n25_moveCharacter", target: "旁白", from: "right", to: "center", duration: 1000, easing: "ease-out", label: "老师走到讲台") {
  next: "n26_dialog"
}

@dialog(id: "n26_dialog", character: "林老师", label: "林老师讲话") {
  content: "同学们好！今天进行随堂测验。请大家认真答题，考试时间30分钟。"
  background: "assets/backgrounds/ComfyUI_00002_.png"
  next: "n27_timer"
}

@timer(id: "n27_timer", mode: "countdown", duration: 3000, label: "考试倒计时", variable: "计时结果") {
  next: "n28_dialog"
}

@dialog(id: "n28_dialog", character: "林老师", label: "考试结束") {
  content: "时间到！请交卷。希望大家都发挥出了自己的水平。"
  background: "assets/backgrounds/ComfyUI_00002_.png"
  next: "n29_setVariable"
}

@setVar(id: "n29_setVariable", var: "学习进度", op: "+=", value: "30", label: "学习进度提升") {
  next: "n30_condition"
}

@condition(id: "n30_condition", label: "考试通过判断") {
  expr: "学习进度 >= 30"
  true: "n31_dialog"
  false: "n34_dialog"
}

@dialog(id: "n31_dialog", character: "林老师", label: "通过考试") {
  content: "不错，你通过了测验！看来这段时间的努力没有白费。"
  background: "assets/backgrounds/ComfyUI_00004_.png"
  next: "n32_setVariable"
}

@setVar(id: "n32_setVariable", var: "金钱", op: "+=", value: "100", label: "获得奖励100元") {
  next: "n33_setVariable"
}

@setVar(id: "n33_setVariable", var: "剧情进度", op: "+=", value: "3", label: "剧情+3") {
  next: "n36_goto"
}

@dialog(id: "n34_dialog", character: "林老师", label: "未通过考试") {
  content: "很遗憾，这次没有通过。不过别灰心，还有补考的机会。"
  background: "assets/backgrounds/ComfyUI_00004_.png"
  next: "n35_setVariable"
}

@setVar(id: "n35_setVariable", var: "学习进度", op: "+=", value: "15", label: "学习进度+15（补课）") {
  next: "n36_goto"
}

@goto(id: "n36_goto", target: "★ 第三章：操场邂逅", label: "遇见小海") {
}

@label(id: "n37_label", label: "★ 第三章：操场邂逅", color: "#74B88A") {
}

@wait(id: "n38_wait", duration: "500", label: "课间休息") {
  next: "n39_audio"
}

@audio(id: "n39_audio", type: "bgm", action: "play", src: "assets/audio/sports_bgm.mp3", loop: "false", volume: "1", label: "操场BGM") {
  next: "n40_dialog"
}

@dialog(id: "n40_dialog", character: "小海", label: "遇见小海") {
  content: "嘿！你就是新来的转学生吧？我叫小海，是篮球队的。要不要来球场看看？"
  background: "assets/backgrounds/ComfyUI_00035_.png"
  next: "n41_choice"
}

@choice(id: "n41_choice", title: "小海邀请你去球场，你要？", label: "小海的邀请") {
  option("去球场") { next: "n42_dialog" }
  option("做作业") { next: "n55_dialog" }
}

@dialog(id: "n42_dialog", character: "小海", label: "接受邀请") {
  content: "太好了！来，我教你投篮！"
  background: "assets/backgrounds/ComfyUI_00037_.png"
  next: "n43_setVariable"
}

@setVar(id: "n43_setVariable", var: "小海好感度", op: "+=", value: "15", label: "小海好感+15") {
  next: "n44_setVariable"
}

@setVar(id: "n44_setVariable", var: "勇气值", op: "+=", value: "30", label: "勇气+30") {
  next: "n45_setVariable"
}

@setVar(id: "n45_setVariable", var: "选择次数", op: "+=", value: "1", label: "选择次数+1") {
  next: "n46_random"
}

@random(id: "n46_random", label: "球场随机事件") {
  option("n47_dialog", 4)
  option("n49_dialog", 2)
  option("n51_dialog", 1)
}

@dialog(id: "n47_dialog", character: "小海", label: "普通比赛") {
  content: "打得不错！下次再一起玩吧！"
  background: "assets/backgrounds/ComfyUI_00037_.png"
  next: "n48_setVariable"
}

@setVar(id: "n48_setVariable", var: "运气值", op: "+=", value: "10", label: "运气+10") {
  next: "n58_goto"
}

@dialog(id: "n49_dialog", character: "旁白", label: "捡到钱包") {
  content: "在球场角落，你发现了一个钱包！里面有200元。"
  background: "assets/backgrounds/ComfyUI_00037_.png"
  next: "n50_setVariable"
}

@setVar(id: "n50_setVariable", var: "金钱", op: "+=", value: "200", label: "金钱+200") {
  next: "n58_goto"
}

@dialog(id: "n51_dialog", character: "旁白", label: "发现密室") {
  content: "球场储物柜后面有一扇暗门！里面是一个被遗忘的社团活动室，墙上挂着往届学生的照片和留言。"
  background: "assets/backgrounds/ComfyUI_ANMIE_00024_.png"
  next: "n52_achievement"
}

@achievement(id: "n52_achievement", achievementId: "ach_secret", label: "解锁：秘密发现者") {
  next: "n53_setVariable"
}

@setVar(id: "n53_setVariable", var: "运气值", op: "+=", value: "40", label: "运气+40") {
  next: "n54_setVariable"
}

@setVar(id: "n54_setVariable", var: "剧情进度", op: "+=", value: "5", label: "剧情+5") {
  next: "n58_goto"
}

@dialog(id: "n55_dialog", character: "小海", label: "婉拒邀请") {
  content: "哦...好吧，学习确实很重要。加油！"
  background: "assets/backgrounds/ComfyUI_00005_.png"
  next: "n56_setVariable"
}

@setVar(id: "n56_setVariable", var: "学习进度", op: "+=", value: "25", label: "学习进度+25") {
  next: "n57_setVariable"
}

@setVar(id: "n57_setVariable", var: "小海好感度", op: "+=", value: "3", label: "小海好感+3") {
  next: "n58_goto"
}

@goto(id: "n58_goto", target: "★ 第四章：学园祭", label: "前往第四章") {
}

@label(id: "n59_label", label: "★ 第四章：学园祭", color: "#E88080") {
}

@cg(id: "n60_cg", src: "assets/backgrounds/festival.png", transition: "fade", duration: "800", label: "学园祭CG") {
  next: "n61_dialog"
}

@dialog(id: "n61_dialog", character: "旁白", label: "学园祭开始") {
  content: "学园祭到了！整个学校张灯结彩，到处都是欢声笑语。小樱在樱花树下等你。"
  background: "assets/backgrounds/festival.png"
  next: "n62_savePoint"
}

@savePoint(id: "n62_savePoint", slotLabel: "学园祭前", label: "存档：学园祭") {
  next: "n63_dialog"
}

@dialog(id: "n63_dialog", character: "小樱", label: "樱花树下的约定") {
  content: "你来啦！今天的学园祭很热闹呢。那个...我有话想对你说..."
  background: "assets/backgrounds/ComfyUI_ANMIE_00008_.png"
  next: "n64_choice"
}

@choice(id: "n64_choice", title: "小樱似乎有话要说...", label: "关键选择") {
  option("抢先表白") { next: "n65_dialog" }
  option("等待") { next: "n69_dialog" }
  option("岔开话题") { next: "n72_dialog" }
}

@dialog(id: "n65_dialog", character: "小樱", label: "勇敢表白") {
  content: "！（脸红）我也...我也喜欢你！从你转学来的第一天就..."
  background: "assets/backgrounds/ComfyUI_ANMIE_00008_.png"
  next: "n66_setVariable"
}

@setVar(id: "n66_setVariable", var: "勇气值", op: "+=", value: "50", label: "勇气+50") {
  next: "n67_setVariable"
}

@setVar(id: "n67_setVariable", var: "小樱好感度", op: "+=", value: "30", label: "小樱好感+30") {
  next: "n68_setVariable"
}

@setVar(id: "n68_setVariable", var: "剧情进度", op: "+=", value: "5", label: "剧情+5") {
  next: "n76_goto"
}

@dialog(id: "n69_dialog", character: "小樱", label: "等待小樱") {
  content: "（深呼吸）...其实我一直很感谢你对我的帮助。你是一个很温柔的人。"
  background: "assets/backgrounds/ComfyUI_ANMIE_00008_.png"
  next: "n70_setVariable"
}

@setVar(id: "n70_setVariable", var: "勇气值", op: "+=", value: "15", label: "勇气+15") {
  next: "n71_setVariable"
}

@setVar(id: "n71_setVariable", var: "小樱好感度", op: "+=", value: "15", label: "小樱好感+15") {
  next: "n76_goto"
}

@dialog(id: "n72_dialog", character: "小樱", label: "岔开话题") {
  content: "嗯...章鱼烧确实很好吃呢...（眼神有些失落）"
  background: "assets/backgrounds/ComfyUI_ANMIE_00008_.png"
  next: "n73_setVariable"
}

@setVar(id: "n73_setVariable", var: "勇气值", op: "=", value: "0", label: "勇气+0") {
  next: "n74_setVariable"
}

@setVar(id: "n74_setVariable", var: "小樱好感度", op: "+=", value: "-5", label: "小樱好感-5") {
  next: "n75_setVariable"
}

@setVar(id: "n75_setVariable", var: "选择次数", op: "+=", value: "1", label: "选择次数再+1") {
  next: "n76_goto"
}

@goto(id: "n76_goto", target: "★ 烟花大会", label: "烟花大会") {
}

@label(id: "n77_label", label: "★ 烟花大会", color: "#D8A030") {
}

@audio(id: "n78_audio", type: "bgm", action: "play", src: "assets/audio/fireworks_bgm.mp3", loop: "false", volume: "1", label: "烟花BGM") {
  next: "n79_cg"
}

@cg(id: "n79_cg", src: "assets/backgrounds/fireworks.png", transition: "zoom", duration: "1000", label: "烟花CG") {
  next: "n80_timer"
}

@timer(id: "n80_timer", mode: "countdown", duration: 2000, label: "烟花倒计时", variable: "计时结果") {
  next: "n81_label"
}

@label(id: "n81_label", label: "★ 最终章：结局", color: "#A088D0") {
}

@dialog(id: "n82_dialog", character: "旁白", label: "结局开始") {
  content: "烟花在夜空中绽放，照亮了每个人的脸庞。故事即将迎来结局。"
  background: "assets/backgrounds/ComfyUI_00007_.png"
  next: "n83_condition"
}

@condition(id: "n83_condition", label: "真结局条件") {
  expr: "小樱好感度 >= 40 && 勇气值 >= 60"
  true: "n84_dialog"
  false: "n88_condition"
}

@dialog(id: "n84_dialog", character: "小樱", label: "真结局") {
  content: "谢谢你一直以来的陪伴。和你在一起的每一天，都是我珍贵的回忆。从今往后，也请多关照！"
  background: "assets/backgrounds/sakura_end.png"
  next: "n85_steamAchievement"
}

@steamAchievement(id: "n85_steamAchievement", achievementId: "ach_true_love", label: "Steam真结局成就") {
  next: "n86_achievement"
}

@achievement(id: "n86_achievement", achievementId: "ach_true_love", label: "解锁真爱成就") {
  next: "n87_end"
}

@end(id: "n87_end", type: "true", label: "真结局") {
  message: "樱花树下的约定，将永远留在两颗相爱的心中。感谢游玩！"
  background: "assets/backgrounds/sakura_end.png"
}

@condition(id: "n88_condition", label: "好结局条件") {
  expr: "小樱好感度 >= 20"
  true: "n89_dialog"
  false: "n91_dialog"
}

@dialog(id: "n89_dialog", character: "小樱", label: "好结局") {
  content: "这一年过得很开心。虽然有些话没能说出口，但这些回忆我会永远珍藏。"
  background: "assets/backgrounds/sakura_end.png"
  next: "n90_end"
}

@end(id: "n90_end", type: "good", label: "好结局") {
  message: "虽然没有表白，但友情的羁绊同样珍贵。故事仍将继续..."
  background: "assets/backgrounds/school_end.png"
}

@dialog(id: "n91_dialog", character: "旁白", label: "普通结局") {
  content: "樱花飘落，春天结束了。你与新朋友们的关系还很浅，但未来还有很长的路要走。"
  background: "assets/backgrounds/school_end.png"
  next: "n92_animation"
}

@anim(id: "n92_animation", target: "screen", action: "exit", duration: "800", position: "left", label: "樱花飘落") {
  next: "n93_wait"
}

@wait(id: "n93_wait", duration: "1000", label: "最终等待") {
  next: "n94_end"
}

@end(id: "n94_end", type: "normal", label: "普通结局") {
  message: "故事平淡地结束了。也许下一次，你会做出不同的选择。"
}
