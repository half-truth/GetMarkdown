import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const StepDownload = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Button press animation
  const btnPress = frame > fps * 0.8 && frame < fps * 1.2;
  const btnScale = btnPress ? 0.95 : 1;

  // File flying down animation
  const fileFrame = frame - fps * 1.3;
  const fileProgress = fileFrame > 0
    ? spring({ frame: fileFrame, fps, config: { damping: 10 } })
    : 0;
  const fileY = interpolate(fileProgress, [0, 1], [-100, 0]);
  const fileOpacity = interpolate(fileProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Checkmark
  const checkFrame = frame - fps * 2.2;
  const checkScale = checkFrame > 0
    ? spring({ frame: checkFrame, fps, config: { damping: 8, mass: 0.5 } })
    : 0;

  // Obsidian vault files appearing
  const vaultFrame = frame - fps * 2.8;
  const vaultOpacity = vaultFrame > 0
    ? interpolate(vaultFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" })
    : 0;

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
        <span style={{ color: "#4a90d9", fontSize: 20, fontWeight: 700 }}>STEP 4</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, marginLeft: 12 }}>
          下载到 Obsidian
        </span>
      </div>

      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {/* Download Button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 180,
              height: 56,
              background: "#4a90d9",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
              fontWeight: 600,
              transform: `scale(${btnScale})`,
              boxShadow: "0 4px 20px rgba(74, 144, 217, 0.4)",
            }}
          >
            ⬇️ 下载
          </div>

          {/* Arrow */}
          <div
            style={{
              fontSize: 36,
              color: "rgba(74, 144, 217, 0.6)",
              opacity: fileOpacity,
            }}
          >
            ↓
          </div>
        </div>

        {/* File Card */}
        <div
          style={{
            width: 320,
            transform: `translateY(${fileY}px)`,
            opacity: fileOpacity,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>📄</div>
              <div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
                  深度学习在自然语言处理中的最新进展.md
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                  2,847 字符 · 2026-03-18
                </div>
              </div>
            </div>

            {/* Checkmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                transform: `scale(${checkScale})`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#28c840",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <span style={{ color: "#28c840", fontSize: 14 }}>保存成功</span>
            </div>
          </div>
        </div>

        {/* Obsidian Vault */}
        <div style={{ opacity: vaultOpacity }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 12 }}>
            📁 My Obsidian Vault
          </div>
          {["笔记/", "收藏/", "→ 深度学习...md ✨", "模板/"].map((item, i) => (
            <div
              key={item}
              style={{
                color: item.includes("✨") ? "#8ec5fc" : "rgba(255,255,255,0.35)",
                fontSize: 14,
                padding: "4px 0 4px 16px",
                fontWeight: item.includes("✨") ? 600 : 400,
                borderLeft: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
