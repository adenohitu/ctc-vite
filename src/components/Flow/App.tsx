import React, { useCallback } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  Position,
  Handle,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  BaseEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styles from "./index.module.scss";

// センサーノード - 列車の存在を検知する
const SensorNode = ({ data }: { data: { label: string; status?: string } }) => {
  const status = data.status || "inactive";
  return (
    <div className={`${styles.sensorNode} ${styles[status]}`}>
      <div className={styles.nodeLabel}>{data.label}</div>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
    </div>
  );
};

// 分岐器ノード - 線路の分岐点 (東西両方向対応版)
const SwitchNode = ({
  data,
}: {
  data: { label: string; state?: string; direction?: string };
}) => {
  const state = data.state || "straight";
  const direction = data.direction || "west"; // デフォルトは西向き

  return (
    <div
      className={`${styles.switchNode} ${styles[state]} ${styles[direction]}`}
    >
      <div className={styles.nodeLabel}>{data.label}</div>

      {direction === "west" ? (
        // 西向き分岐器（入力は左、出力は右に2つ）
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className={styles.handle}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="straight"
            style={{ top: "30%" }}
            className={styles.handle}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="diverging"
            style={{ top: "70%" }}
            className={styles.handle}
          />
        </>
      ) : (
        // 東向き分岐器（入力は左に2つ、出力は右）
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="straight"
            style={{ top: "30%" }}
            className={styles.handle}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="diverging"
            style={{ top: "70%" }}
            className={styles.handle}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className={styles.handle}
          />
        </>
      )}
    </div>
  );
};

// 停止位置ノード - 列車が停車できる位置
const StopNode = ({
  data,
}: {
  data: { label: string; occupied?: boolean; platform?: string };
}) => {
  const occupied = data.occupied ? "occupied" : "vacant";
  return (
    <div className={`${styles.stopNode} ${styles[occupied]}`}>
      <div className={styles.nodeLabel}>
        {data.platform ? `${data.platform} ` : ""}
        {data.label}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
    </div>
  );
};

// ノードタイプの登録
const nodeTypes = {
  sensor: SensorNode,
  switch: SwitchNode,
  stop: StopNode,
};

// エッジの進行方向を示す矢印を定義
const DirectionArrow = ({ direction }: { direction: "left" | "right" }) => (
  <span className={styles.directionArrow}>
    {direction === "left" ? "←" : "→"}
  </span>
);

// 列車のラベルコンポーネント
const TrainLabel = ({
  id,
  name,
  direction = "right",
}: {
  id: string;
  name: string;
  direction?: "left" | "right";
}) => {
  return (
    <div className={styles.trainLabel}>
      <div className={styles.trainId}>{id}</div>
      <div className={styles.trainName}>{name}</div>
      <DirectionArrow direction={direction} />
    </div>
  );
};

// カスタムエッジ - 標準のエッジと列車ラベルを組み合わせたもの
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
  animated,
}: EdgeProps & {
  data: { train: { id: string; name: string; direction: "left" | "right" } };
}) => {
  // 標準の直線パスを生成
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.train && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${
                (sourceX + targetX) / 2
              }px, ${(sourceY + targetY) / 2}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <TrainLabel
              id={data.train.id}
              name={data.train.name}
              direction={data.train.direction}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// カスタム直線エッジ（列車ラベル付き）
const CustomStraightEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  markerEnd,
}: EdgeProps & {
  data?: { train?: { id: string; name: string; direction: "left" | "right" } };
}) => {
  const edgePath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {data?.train && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${
                (sourceX + targetX) / 2
              }px, ${(sourceY + targetY) / 2}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <TrainLabel
              id={data.train.id}
              name={data.train.name}
              direction={data.train.direction}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// エッジタイプの登録
const edgeTypes = {
  custom: CustomEdge,
  customStraight: CustomStraightEdge,
};

// 初期ノードの設定 - 左右方向の幅をさらに広くとる
const initialNodes: Node[] = [
  // === 西駅（2番線まで） ===
  // 西側終端センサー
  {
    id: "sensor-west-terminal",
    type: "sensor",
    data: { label: "西終端センサー" },
    position: { x: -1200, y: 150 },
  },
  // 西駅分岐器
  {
    id: "switch-west-station",
    type: "switch",
    data: { label: "西駅分岐器", state: "straight", direction: "west" },
    position: { x: -950, y: 150 },
  },
  // 西駅1番線
  {
    id: "stop-west-platform1",
    type: "stop",
    data: { label: "停車位置", platform: "西駅1番線" },
    position: { x: -700, y: 100 },
  },
  // 西駅2番線
  {
    id: "stop-west-platform2",
    type: "stop",
    data: { label: "停車位置", platform: "西駅2番線" },
    position: { x: -700, y: 200 },
  },
  // 西駅のセンサー（1番線）
  {
    id: "sensor-west-platform1",
    type: "sensor",
    data: { label: "西駅1番線センサー" },
    position: { x: -550, y: 100 },
  },
  // 西駅のセンサー（2番線）
  {
    id: "sensor-west-platform2",
    type: "sensor",
    data: { label: "西駅2番線センサー" },
    position: { x: -550, y: 200 },
  },
  // 西駅の出口分岐器
  {
    id: "switch-west-station-exit",
    type: "switch",
    data: { label: "西駅出口分岐器", state: "straight", direction: "east" },
    position: { x: -400, y: 150 },
  },
  // 西駅の出口センサー
  {
    id: "sensor-west-station-exit",
    type: "sensor",
    data: { label: "西駅出口センサー" },
    position: { x: -250, y: 150 },
  },

  // === 区間センサー（西駅-中央駅間） === 横方向に余裕を持たせる
  {
    id: "sensor-section1-1",
    type: "sensor",
    data: { label: "区間1-1", status: "active" },
    position: { x: -150, y: 150 },
  },
  {
    id: "sensor-section1-2",
    type: "sensor",
    data: { label: "区間1-2" },
    position: { x: -50, y: 150 },
  },
  {
    id: "sensor-section1-3",
    type: "sensor",
    data: { label: "区間1-3" },
    position: { x: 50, y: 150 },
  },
  {
    id: "sensor-section1-4",
    type: "sensor",
    data: { label: "区間1-4" },
    position: { x: 150, y: 150 },
  },

  // === 中央駅（元の駅） ===
  // 西側の進入センサー
  {
    id: "sensor-west-1",
    type: "sensor",
    data: { label: "中央駅西進入センサー" },
    position: { x: 250, y: 150 },
  },
  // 西側の分岐器（一段目）
  {
    id: "switch-west-1",
    type: "switch",
    data: { label: "西分岐器1", state: "straight", direction: "west" },
    position: { x: 400, y: 150 },
  },
  // 西側の分岐器（二段目）- 上側
  {
    id: "switch-west-2-upper",
    type: "switch",
    data: { label: "西分岐器2上", state: "straight", direction: "west" },
    position: { x: 550, y: 75 },
  },
  // 西側の分岐器（二段目）- 下側
  {
    id: "switch-west-2-lower",
    type: "switch",
    data: { label: "西分岐器2下", state: "straight", direction: "west" },
    position: { x: 550, y: 225 },
  },
  // 1番線の停車位置
  {
    id: "stop-platform1",
    type: "stop",
    data: { label: "停車位置", platform: "1番線" },
    position: { x: 1150, y: 0 },
  },
  // 2番線の停車位置
  {
    id: "stop-platform2",
    type: "stop",
    data: { label: "停車位置", platform: "2番線" },
    position: { x: 1150, y: 150 },
  },
  // 3番線の停車位置
  {
    id: "stop-platform3",
    type: "stop",
    data: { label: "停車位置", platform: "3番線" },
    position: { x: 1150, y: 300 },
  },
  // 4番線の停車位置
  {
    id: "stop-platform4",
    type: "stop",
    data: { label: "停車位置", platform: "4番線" },
    position: { x: 1150, y: 450 },
  },
  // 各線のセンサー
  // 1番線
  {
    id: "sensor-platform1-west",
    type: "sensor",
    data: { label: "1番線西センサー" },
    position: { x: 850, y: 0 },
  },
  {
    id: "sensor-platform1-east",
    type: "sensor",
    data: { label: "1番線東センサー" },
    position: { x: 1450, y: 0 },
  },
  // 2番線
  {
    id: "sensor-platform2-west",
    type: "sensor",
    data: { label: "2番線西センサー" },
    position: { x: 850, y: 150 },
  },
  {
    id: "sensor-platform2-east",
    type: "sensor",
    data: { label: "2番線東センサー" },
    position: { x: 1450, y: 150 },
  },
  // 3番線
  {
    id: "sensor-platform3-west",
    type: "sensor",
    data: { label: "3番線西センサー" },
    position: { x: 850, y: 300 },
  },
  {
    id: "sensor-platform3-east",
    type: "sensor",
    data: { label: "3番線東センサー" },
    position: { x: 1450, y: 300 },
  },
  // 4番線
  {
    id: "sensor-platform4-west",
    type: "sensor",
    data: { label: "4番線西センサー" },
    position: { x: 850, y: 450 },
  },
  {
    id: "sensor-platform4-east",
    type: "sensor",
    data: { label: "4番線東センサー" },
    position: { x: 1450, y: 450 },
  },
  // 東側の分岐器（二段目）- 上側
  {
    id: "switch-east-2-upper",
    type: "switch",
    data: { label: "東分岐器2上", state: "straight", direction: "east" },
    position: { x: 1750, y: 75 },
  },
  // 東側の分岐器（二段目）- 下側
  {
    id: "switch-east-2-lower",
    type: "switch",
    data: { label: "東分岐器2下", state: "straight", direction: "east" },
    position: { x: 1750, y: 225 },
  },
  // 東側の分岐器（一段目）
  {
    id: "switch-east-1",
    type: "switch",
    data: { label: "東分岐器1", state: "straight", direction: "east" },
    position: { x: 1900, y: 150 },
  },
  // 東側の進入センサー
  {
    id: "sensor-east-1",
    type: "sensor",
    data: { label: "東進入センサー" },
    position: { x: 2050, y: 150 },
  },
];

// 初期エッジの設定
const initialEdges: Edge[] = [
  // === 西駅関連のエッジ ===
  // 西側終端から西駅分岐器へ
  {
    id: "west-terminal-to-switch",
    source: "sensor-west-terminal",
    target: "switch-west-station",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 西駅分岐器から西駅1番線へ
  {
    id: "west-switch-to-platform1",
    source: "switch-west-station",
    sourceHandle: "straight",
    target: "stop-west-platform1",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西駅分岐器から西駅2番線へ
  {
    id: "west-switch-to-platform2",
    source: "switch-west-station",
    sourceHandle: "diverging",
    target: "stop-west-platform2",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西駅1番線から西駅1番線センサーへ
  {
    id: "west-platform1-to-sensor",
    source: "stop-west-platform1",
    target: "sensor-west-platform1",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1004",
        name: "普通 中央駅行",
        direction: "right",
      },
    },
  },

  // 西駅2番線から西駅2番線センサーへ
  {
    id: "west-platform2-to-sensor",
    source: "stop-west-platform2",
    target: "sensor-west-platform2",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 西駅1番線センサーから西駅出口分岐器へ
  {
    id: "west-sensor1-to-exit-switch",
    source: "sensor-west-platform1",
    target: "switch-west-station-exit",
    targetHandle: "straight",
    animated: true,
    className: styles.trackEdgeActive,
    type: "custom",
    data: {
      train: {
        id: "1004",
        name: "普通 中央駅行",
        direction: "right",
      },
    },
  },

  // 西駅2番線センサーから西駅出口分岐器へ
  {
    id: "west-sensor2-to-exit-switch",
    source: "sensor-west-platform2",
    target: "switch-west-station-exit",
    targetHandle: "diverging",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西駅出口分岐器から西駅出口センサーへ
  {
    id: "west-exit-switch-to-sensor",
    source: "switch-west-station-exit",
    sourceHandle: "output",
    target: "sensor-west-station-exit",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1004",
        name: "普通 中央駅行",
        direction: "right",
      },
    },
  },

  // === 区間1（西駅-中央駅）の接続 ===
  // 区間1-1から1-2へ
  {
    id: "section1-1-to-2",
    source: "sensor-section1-1",
    target: "sensor-section1-2",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1004",
        name: "普通 中央駅行",
        direction: "right",
      },
    },
  },

  // 区間1-2から1-3へ
  {
    id: "section1-2-to-3",
    source: "sensor-section1-2",
    target: "sensor-section1-3",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 区間1-3から1-4へ
  {
    id: "section1-3-to-4",
    source: "sensor-section1-3",
    target: "sensor-section1-4",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 区間1-4から中央駅西進入センサーへ
  {
    id: "section1-4-to-central",
    source: "sensor-section1-4",
    target: "sensor-west-1",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 西駅出口センサーから区間1-1へ
  {
    id: "west-exit-to-section1-1",
    source: "sensor-west-station-exit",
    target: "sensor-section1-1",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1004",
        name: "普通 中央駅行",
        direction: "right",
      },
    },
  },

  // === 中央駅の既存接続 ===
  // 西側進入路
  {
    id: "west-entry-to-switch1",
    source: "sensor-west-1",
    target: "switch-west-1",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 西側一段目分岐器から二段目上部分岐器へ
  {
    id: "west-switch1-to-switch2-upper",
    source: "switch-west-1",
    sourceHandle: "straight",
    target: "switch-west-2-upper",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西側一段目分岐器から二段目下部分岐器へ
  {
    id: "west-switch1-to-switch2-lower",
    source: "switch-west-1",
    sourceHandle: "diverging",
    target: "switch-west-2-lower",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西側二段目上部分岐器から1番線へ
  {
    id: "west-switch2-upper-to-platform1",
    source: "switch-west-2-upper",
    sourceHandle: "straight",
    target: "sensor-platform1-west",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西側二段目上部分岐器から2番線へ
  {
    id: "west-switch2-upper-to-platform2",
    source: "switch-west-2-upper",
    sourceHandle: "diverging",
    target: "sensor-platform2-west",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西側二段目下部分岐器から3番線へ
  {
    id: "west-switch2-lower-to-platform3",
    source: "switch-west-2-lower",
    sourceHandle: "straight",
    target: "sensor-platform3-west",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 西側二段目下部分岐器から4番線へ
  {
    id: "west-switch2-lower-to-platform4",
    source: "switch-west-2-lower",
    sourceHandle: "diverging",
    target: "sensor-platform4-west",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 各番線の線路
  // 1番線
  {
    id: "platform1-west-to-stop",
    source: "sensor-platform1-west",
    target: "stop-platform1",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1002",
        name: "各停 品川行",
        direction: "right",
      },
    },
  },
  {
    id: "platform1-stop-to-east",
    source: "stop-platform1",
    target: "sensor-platform1-east",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 2番線
  {
    id: "platform2-west-to-stop",
    source: "sensor-platform2-west",
    target: "stop-platform2",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },
  {
    id: "platform2-stop-to-east",
    source: "stop-platform2",
    target: "sensor-platform2-east",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 3番線
  {
    id: "platform3-west-to-stop",
    source: "sensor-platform3-west",
    target: "stop-platform3",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },
  {
    id: "platform3-stop-to-east",
    source: "stop-platform3",
    target: "sensor-platform3-east",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
  },

  // 4番線
  {
    id: "platform4-west-to-stop",
    source: "sensor-platform4-west",
    target: "stop-platform4",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },
  {
    id: "platform4-stop-to-east",
    source: "stop-platform4",
    target: "sensor-platform4-east",
    animated: false,
    className: styles.trackEdge,
    type: "customStraight",
  },

  // 東側への接続
  // 1番線から東側二段目上部分岐器へ
  {
    id: "platform1-east-to-switch2-upper",
    source: "sensor-platform1-east",
    target: "switch-east-2-upper",
    targetHandle: "straight",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 2番線から東側二段目上部分岐器へ
  {
    id: "platform2-east-to-switch2-upper",
    source: "sensor-platform2-east",
    target: "switch-east-2-upper",
    targetHandle: "diverging",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 3番線から東側二段目下部分岐器へ
  {
    id: "platform3-east-to-switch2-lower",
    source: "sensor-platform3-east",
    target: "switch-east-2-lower",
    targetHandle: "straight",
    animated: true,
    className: styles.trackEdgeActive,
    type: "custom",
    data: {
      train: {
        id: "1003",
        name: "特急 大宮行",
        direction: "right",
      },
    },
  },

  // 4番線から東側二段目下部分岐器へ
  {
    id: "platform4-east-to-switch2-lower",
    source: "sensor-platform4-east",
    target: "switch-east-2-lower",
    targetHandle: "diverging",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 東側二段目上部分岐器から一段目分岐器へ
  {
    id: "east-switch2-upper-to-switch1",
    source: "switch-east-2-upper",
    sourceHandle: "output",
    target: "switch-east-1",
    targetHandle: "straight",
    animated: false,
    className: styles.trackEdge,
    type: "custom",
  },

  // 東側二段目下部分岐器から一段目分岐器へ
  {
    id: "east-switch2-lower-to-switch1",
    source: "switch-east-2-lower",
    sourceHandle: "output",
    target: "switch-east-1",
    targetHandle: "diverging",
    animated: true,
    className: styles.trackEdgeActive,
    type: "custom",
    data: {
      train: {
        id: "1003",
        name: "特急 大宮行",
        direction: "right",
      },
    },
  },

  // 東側出口
  {
    id: "east-switch1-to-exit",
    source: "switch-east-1",
    sourceHandle: "output",
    target: "sensor-east-1",
    animated: true,
    className: styles.trackEdgeActive,
    type: "customStraight",
    data: {
      train: {
        id: "1003",
        name: "特急 大宮行",
        direction: "right",
      },
    },
  },
];

const FlowApp: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((els) => addEdge(params, els)),
    [setEdges]
  );

  // アニメーションを切り替えるサンプル関数
  const toggleAnimation = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              animated: !edge.animated,
              className: edge.animated
                ? styles.trackEdge
                : styles.trackEdgeActive,
            };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  return (
    <div className={styles.flowContainer}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.02} // より広いレイアウトに対応するためさらに小さく調整
        maxZoom={2}
        className={styles.reactFlow}
        snapToGrid={true}
        snapGrid={[10, 10]}
        nodesDraggable={true}
      >
        <Controls />
        <MiniMap />
        <Background color="#f0f0f0" gap={16} />
      </ReactFlow>
      {/* コントロールパネルは必要に応じて実装 */}
    </div>
  );
};

export default FlowApp;
