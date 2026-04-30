import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 10 } });

  const textOpacity = interpolate(frame, [fps * 0.5, fps * 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(frame, [fps * 1.2, fps * 1.8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const starScale = spring({
    frame: frame - fps * 2,
    fps,
    config: { damping: 8, mass: 0.5 },
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
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ fontSize: 72, transform: `scale(${logoScale})`, marginBottom: 24 }}>
        📝
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#fff",
          opacity: textOpacity,
          marginBottom: 12,
        }}
      >
        开始使用 MarkDownload
      </div>

      <div
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.6)",
          opacity: urlOpacity,
          marginBottom: 40,
        }}
      >
        github.com/yuevthins/markdownload-zh
      </div>

      <div
        style={{
          transform: `scale(${starScale})`,
          background: "rgba(255, 215, 0, 0.15)",
          border: "1px solid rgba(255, 215, 0, 0.4)",
          borderRadius: 24,
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 24 }}>⭐</span>
        <span style={{ color: "#ffd700", fontSize: 18, fontWeight: 600 }}>
          Star on GitHub
        </span>
      </div>
    </div>
  );
};
