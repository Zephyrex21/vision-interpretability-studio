import { motion } from 'framer-motion';
import styles from './NetworkDiagram.module.css';

const LAYER_SIZES = [3, 5, 5, 3];
const WIDTH = 300;
const HEIGHT = 240;
const PAD_X = 26;
const PAD_Y = 26;

function layerX(layerIndex: number): number {
  return PAD_X + (layerIndex * (WIDTH - PAD_X * 2)) / (LAYER_SIZES.length - 1);
}

function nodeY(nodeIndex: number, nodeCount: number): number {
  const spacing = (HEIGHT - PAD_Y * 2) / (nodeCount + 1);
  return PAD_Y + spacing * (nodeIndex + 1);
}

const LAYER_POSITIONS = LAYER_SIZES.map((count, layerIndex) =>
  Array.from({ length: count }, (_, nodeIndex) => ({
    x: layerX(layerIndex),
    y: nodeY(nodeIndex, count),
  })),
);

const WAVE_DURATION = 2.6;
const WAVE_STAGGER = 0.42;
const LAYER_COLORS = ['var(--heat-low)', 'var(--heat-mid)', 'var(--heat-mid)', 'var(--heat-high)'];

/**
 * A stylized, illustrative diagram — not a literal rendering of the
 * trained model's real architecture or weights. It exists to give the
 * hero a distinctive, on-theme, fully animatable visual instead of a
 * static photo, echoing the headline ("watch a neural network think")
 * without claiming to be a screenshot of anything.
 */
export function NetworkDiagram() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={styles.svg}
      role="img"
      aria-label="Animated illustration of a layered neural network"
    >
      {/* Connections, grouped per layer-transition so each group can pulse
          together as the "activation wave" passes through it. */}
      {LAYER_POSITIONS.slice(0, -1).map((layer, layerIndex) => (
        <motion.g
          key={`edges-${layerIndex}`}
          className={styles.edgeGroup}
          initial={{ opacity: 0.14 }}
          animate={{ opacity: [0.14, 0.6, 0.14] }}
          transition={{
            duration: WAVE_DURATION,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: layerIndex * WAVE_STAGGER,
          }}
        >
          {layer.map((from, fromIdx) =>
            LAYER_POSITIONS[layerIndex + 1].map((to, toIdx) => (
              <line
                key={`${fromIdx}-${toIdx}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={styles.edge}
              />
            )),
          )}
        </motion.g>
      ))}

      {/* Nodes, pulsing in sequence to sell the left-to-right data flow. */}
      {LAYER_POSITIONS.map((layer, layerIndex) => (
        <g key={`nodes-${layerIndex}`}>
          {layer.map((node, nodeIndex) => (
            <motion.circle
              key={nodeIndex}
              cx={node.x}
              cy={node.y}
              className={styles.node}
              style={{ fill: LAYER_COLORS[layerIndex], color: LAYER_COLORS[layerIndex] }}
              initial={{ r: 3.2 }}
              animate={{ r: [3.2, 5.2, 3.2] }}
              transition={{
                duration: WAVE_DURATION,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: layerIndex * WAVE_STAGGER,
              }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
