import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 12 } }) * 40 - 40;
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [fps * 0.6, fps * 1.2], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [fps * 0.6, fps * 1.2], [20, 0], {
    extrapolateRight: "clamp",
  });

  const badgeScale = spring({
    frame: frame - fps * 1.5,
    fps,
    config: { damping: 10, mass: 0.5 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 64,
          marginBottom: 20,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        📝
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#fff",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          letterSpacing: 2,
        }}
      >
        MarkDownload 中文版
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 24,
          color: "rgba(255,255,255,0.7)",
          marginTop: 16,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        网页一键剪藏为 Markdown · 专为 Obsidian 打造
      </div>

      {/* Badge */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          gap: 12,
          transform: `scale(${badgeScale})`,
        }}
      >
        {["activeTab 权限", "62 个站点适配", "完全本地处理"].map((text) => (
          <div
            key={text}
            style={{
              background: "rgba(74, 144, 217, 0.3)",
              border: "1px solid rgba(74, 144, 217, 0.5)",
              borderRadius: 20,
              padding: "8px 20px",
              color: "#8ec5fc",
              fontSize: 16,
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};
