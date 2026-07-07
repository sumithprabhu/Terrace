const NODES = [
  { x: 160, y: 35 },
  { x: 268, y: 98 },
  { x: 268, y: 223 },
  { x: 160, y: 285 },
  { x: 52, y: 223 },
  { x: 52, y: 97 }
]

const LINES: { a: { x: number; y: number }; b: { x: number; y: number }; delay: number }[] = []
for (let i = 0; i < NODES.length; i++) {
  for (let j = i + 1; j < NODES.length; j++) {
    LINES.push({ a: NODES[i], b: NODES[j], delay: LINES.length * 0.08 })
  }
}

const USER_ICON = "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
const ACTIVITY_ICON =
  "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"

export function MeshAnimation() {
  return (
    <svg className="h-auto w-full max-w-[340px]" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
      {LINES.map((line, i) => (
        <line
          key={i}
          className="mesh-line"
          x1={line.a.x}
          y1={line.a.y}
          x2={line.b.x}
          y2={line.b.y}
          style={{ animationDelay: `${line.delay.toFixed(2)}s` }}
        />
      ))}

      {NODES.map((node, i) => (
        <g key={i}>
          <circle
            className="mesh-node"
            cx={node.x}
            cy={node.y}
            r="24"
            style={{ animationDelay: `${(i * 0.3).toFixed(2)}s` }}
          />
          <g transform={`translate(${node.x - 11}, ${node.y - 11}) scale(0.92)`} className="mesh-node-icon">
            <path d={USER_ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      ))}

      <g transform="translate(148, 148)">
        <g className="mesh-center-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={ACTIVITY_ICON} />
        </g>
      </g>
    </svg>
  )
}
