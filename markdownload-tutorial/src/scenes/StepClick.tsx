import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const StepClick = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Cursor animation: moves toward extension icon
  const cursorX = interpolate(frame, [fps * 0.5, fps * 1.5], [400, 820], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [fps * 0.5, fps * 1.5], [350, 48], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorOpacity = interpolate(frame, [fps * 0.3, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Click ripple
  const clickFrame = frame - fps * 1.6;
  const rippleScale = clickFrame > 0
    ? spring({ frame: clickFrame, fps, config: { damping: 8 } }) * 2
    : 0;
  const rippleOpacity = clickFrame > 0
    ? interpolate(clickFrame, [0, fps * 0.5], [0.6, 0], { extrapolateRight: "clamp" })
    : 0;

  // Popup appears after click
  const popupProgress = spring({
    frame: frame - fps * 2,
    fps,
    config: { damping: 12, mass: 0.6 },
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
        <span style={{ color: "#4a90d9", fontSize: 20, fontWeight: 700 }}>STEP 2</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, marginLeft: 12 }}>
          点击扩展图标
        </span>
      </div>

      {/* Chrome toolbar with extension icon */}
      <div
        style={{
          position: "absolute",
          top: 120,
          width: 900,
          height: 44,
          background: "#f0f0f0",
          borderRadius: "12px 12px 0 0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e", marginLeft: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", marginLeft: 8 }} />
        <div style={{ flex: 1 }} />

        {/* Extension Icon */}
        <div
          style={{
            width: 32,
            height: 32,
            background: "#4a90d9",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          M↓
        </div>
      </div>

      {/* Browser body (dimmed) */}
      <div
        style={{
          position: "absolute",
          top: 164,
          width: 900,
          height: 440,
          background: "rgba(255,255,255,0.1)",
          borderRadius: "0 0 12px 12px",
        }}
      />

      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          opacity: cursorOpacity,
          fontSize: 28,
          transform: "rotate(-15deg)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        🖱️
      </div>

      {/* Click Ripple */}
      <div
        style={{
          position: "absolute",
          left: 820,
          top: 48,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid #4a90d9",
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          opacity: rippleOpacity,
          zIndex: 5,
        }}
      />

      {/* Popup appearing */}
      {popupProgress > 0.01 && (
        <div
          style={{
            position: "absolute",
            top: 170,
            right: 220,
            width: 380,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            transform: `scale(${popupProgress}) translateY(${(1 - popupProgress) * -20}px)`,
            transformOrigin: "top right",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 34,
                border: "2px solid #4a90d9",
                borderRadius: 4,
                padding: "0 10px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                color: "#333",
              }}
            >
              深度学习在自然语言处理中的最新进展
            </div>
            <div style={{ padding: "6px 10px", background: "#f5f5f5", borderRadius: 4, fontSize: 13 }}>📋</div>
            <div
              style={{
                padding: "6px 14px",
                background: "#4a90d9",
                borderRadius: 4,
                fontSize: 13,
                color: "#fff",
              }}
            >
              ⬇ 下载
            </div>
          </div>
          <div style={{ height: 120, background: "#f9f9f9", padding: 12 }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#444", lineHeight: 1.6 }}>
              ---<br />
              title: &quot;深度学习在自然语言处理...&quot;<br />
              id: 20260318-k7f2<br />
              created: 2026-03-18<br />
              status: draft<br />
              ---
            </div>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 11, color: "#888", borderTop: "1px solid #eee" }}>
            ✅ 来源: mp.weixin.qq.com
          </div>
        </div>
      )}
    </div>
  );
};
