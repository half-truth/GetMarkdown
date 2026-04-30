import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const StepBrowse = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const browserScale = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 12 },
  });

  const contentOpacity = interpolate(frame, [fps * 1, fps * 1.5], [0, 1], {
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
      }}
    >
      {/* Step Label */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          opacity: stepOpacity,
        }}
      >
        <span style={{ color: "#4a90d9", fontSize: 20, fontWeight: 700 }}>
          STEP 1
        </span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, marginLeft: 12 }}>
          打开任意网页
        </span>
      </div>

      {/* Browser Mockup */}
      <div
        style={{
          width: 900,
          height: 520,
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          transform: `scale(${browserScale})`,
        }}
      >
        {/* Chrome Bar */}
        <div
          style={{
            height: 40,
            background: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          <div
            style={{
              flex: 1,
              marginLeft: 20,
              height: 26,
              background: "#fff",
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              fontSize: 13,
              color: "#666",
            }}
          >
            https://mp.weixin.qq.com/s/deep-learning-nlp-2026
          </div>
        </div>

        {/* Article Content */}
        <div style={{ padding: 40, opacity: contentOpacity }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            深度学习在自然语言处理中的最新进展
          </div>
          <div style={{ fontSize: 14, color: "#999", marginBottom: 24 }}>
            作者: 张三 · 2026-03-18 · 阅读 12,847
          </div>
          <div style={{ fontSize: 16, color: "#333", lineHeight: 1.8 }}>
            近年来，深度学习技术在自然语言处理领域取得了突破性进展。从 Transformer
            架构的提出到大语言模型的广泛应用，NLP 的能力边界不断被拓展。本文将深入
            探讨最新的技术进展和应用实践...
          </div>
          <div
            style={{
              marginTop: 20,
              width: "100%",
              height: 180,
              background: "linear-gradient(135deg, #e8f4fd, #d1ecf9)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4a90d9",
              fontSize: 14,
            }}
          >
            [文章配图]
          </div>
        </div>
      </div>
    </div>
  );
};
