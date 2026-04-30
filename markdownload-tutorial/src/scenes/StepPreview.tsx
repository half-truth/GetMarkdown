import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const YAML_LINES = [
  "---",
  'title: "深度学习在自然语言处理中的最新进展"',
  "id: 20260318-k7f2",
  "created: 2026-03-18",
  "updated: 2026-03-18",
  "captured: 2026-03-18 21:30:00",
  "status: draft",
  "category: resource",
  "tags:",
  "  - 收藏",
  "source: https://mp.weixin.qq.com/s/...",
  "site: mp.weixin.qq.com",
  "---",
  "",
  "## 引言",
  "",
  "近年来，深度学习技术在自然语言处理领域",
  "取得了突破性进展。从 Transformer 架构的",
  "提出到大语言模型的广泛应用...",
];

export const StepPreview = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Typewriter: reveal lines progressively
  const charsPerSecond = 60;
  const totalCharsRevealed = Math.floor((frame / fps) * charsPerSecond);

  let charsCount = 0;
  const visibleLines: string[] = [];
  for (const line of YAML_LINES) {
    if (charsCount >= totalCharsRevealed) break;
    const remaining = totalCharsRevealed - charsCount;
    if (remaining >= line.length) {
      visibleLines.push(line);
      charsCount += line.length + 1;
    } else {
      visibleLines.push(line.slice(0, remaining));
      charsCount += remaining;
    }
  }

  // Highlight badge
  const highlightOpacity = interpolate(frame, [fps * 2.5, fps * 3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
      }}
    >
      {/* Step Label */}
      <div style={{ position: "absolute", top: 60, left: 80, opacity: stepOpacity }}>
        <span style={{ color: "#4a90d9", fontSize: 20, fontWeight: 700 }}>STEP 3</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, marginLeft: 12 }}>
          实时预览 Markdown
        </span>
      </div>

      {/* Code Preview Window */}
      <div
        style={{
          width: 800,
          height: 480,
          background: "#1e1e3a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            background: "#2a2a4a",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 8,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            preview.md
          </div>
        </div>

        {/* Code content */}
        <div style={{ padding: "16px 24px", fontFamily: "'Monaco', 'Menlo', monospace", fontSize: 14, lineHeight: 1.7 }}>
          {visibleLines.map((line, i) => {
            const isYamlDelimiter = line === "---";
            const isKey = line.includes(":") && !line.startsWith(" ") && !isYamlDelimiter;
            const isHeading = line.startsWith("##");

            let color = "rgba(255,255,255,0.7)";
            if (isYamlDelimiter) color = "#888";
            else if (isKey) color = "#8ec5fc";
            else if (isHeading) color = "#7ee787";

            return (
              <div key={i} style={{ color, minHeight: 20 }}>
                {line || "\u00A0"}
              </div>
            );
          })}
          {/* Blinking cursor */}
          {visibleLines.length < YAML_LINES.length && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 18,
                background: "#4a90d9",
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                verticalAlign: "text-bottom",
              }}
            />
          )}
        </div>
      </div>

      {/* Obsidian compatible badge */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          opacity: highlightOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            background: "rgba(126, 231, 135, 0.15)",
            border: "1px solid rgba(126, 231, 135, 0.4)",
            borderRadius: 20,
            padding: "8px 24px",
            color: "#7ee787",
            fontSize: 16,
          }}
        >
          ✅ Obsidian 兼容 Frontmatter · 自动生成
        </div>
      </div>
    </div>
  );
};
