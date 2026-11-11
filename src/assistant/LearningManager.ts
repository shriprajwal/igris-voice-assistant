export interface InteractiveLesson {
  id: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  objective: string;
  steps: string[];
  codeSnippet: string;
}

export class LearningManager {
  private static instance: LearningManager | null = null;
  private lessons: InteractiveLesson[] = [
    {
      id: "les_react_hooks",
      topic: "React Hook Optimization & Stabilization",
      difficulty: "intermediate",
      objective: "Learn to design stable effects without triggering infinite render cycles.",
      steps: [
        "Step 1: Declare state using the useState hook at the component top-level.",
        "Step 2: Isolate side effects inside useEffect blocks with primitive dependency variables.",
        "Step 3: Avoid placing object literals, function references, or arrays directly into dependencies.",
        "Step 4: Return clean-up functions to unbind listeners or cancel sockets upon unmounting."
      ],
      codeSnippet: `import { useState, useEffect } from "react";\n\nexport function StableCounter() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    console.log("Effect run for primitive variable value: ", count);\n  }, [count]); // ✅ Safe: primitive dependency\n\n  return (\n    <button onClick={() => setCount(c => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}`
    },
    {
      id: "les_tailwind_grid",
      topic: "Responsive Bento Layouts with Tailwind",
      difficulty: "beginner",
      objective: "Master mobile-first fluid grids using Tailwind's system.",
      steps: [
        "Step 1: Declare standard mobile view widths with full stretch (w-full).",
        "Step 2: Add medium (md:) and large (lg:) grid column definitions.",
        "Step 3: Set uniform gap dimensions and custom negative space padding margins.",
        "Step 4: Constrain container stretch on ultra-wide panels with 'max-w-7xl mx-auto'."
      ],
      codeSnippet: `<div className="w-full max-w-7xl mx-auto px-4 py-8">\n  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">Card A</div>\n    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">Card B</div>\n    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">Card C</div>\n  </div>\n</div>`
    }
  ];

  private constructor() {}

  public static getInstance(): LearningManager {
    if (!LearningManager.instance) {
      LearningManager.instance = new LearningManager();
    }
    return LearningManager.instance;
  }

  public getLessonByTopic(topicKey: string): InteractiveLesson | null {
    const lower = topicKey.toLowerCase();
    const match = this.lessons.find(l => l.topic.toLowerCase().includes(lower) || l.id.includes(lower));
    return match || this.lessons[0];
  }

  public getLessonsList(): InteractiveLesson[] {
    return [...this.lessons];
  }
}
