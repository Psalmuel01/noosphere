import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  NodeProps,
  NodeTypes,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch, ShieldCheck } from 'lucide-react';
import { ReasoningSubmission } from '../types';
import { clusterLabelFromKeywords, keywordSimilarity } from '../lib/scoring';

type GraphNodeData = {
  submission: ReasoningSubmission;
  label: string;
  color: string;
  scale: number;
};

type GraphNode = Node<GraphNodeData, 'reasoning'>;

const palette = ['#6467f2', '#2dd4bf', '#f59e0b', '#f97316', '#38bdf8'];

function ReasoningNode({ data, selected }: NodeProps<GraphNode>) {
  return (
    <div
      className={`min-w-[220px] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${
        selected
          ? 'border-primary bg-slate-950/95 shadow-primary/20'
          : 'border-slate-700/80 bg-slate-950/85'
      }`}
      style={{
        boxShadow: selected ? `0 0 30px ${data.color}22` : undefined,
        transform: `scale(${data.scale})`,
        transformOrigin: 'center',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-100">{data.submission.contributorName}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{data.label}</p>
        </div>
        <div
          className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: `${data.color}33`, color: data.color }}
        >
          {Math.round(data.submission.qualityScore * 100)}%
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-300">{data.submission.conclusion}</p>
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          {data.submission.clusterId.split('-')[1] ?? 'cluster'}
        </span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  reasoning: ReasoningNode,
};

function buildGraph(submissions: ReasoningSubmission[]) {
  const clusters = new Map<string, ReasoningSubmission[]>();
  submissions.forEach((submission) => {
    const current = clusters.get(submission.clusterId) ?? [];
    current.push(submission);
    clusters.set(submission.clusterId, current);
  });

  const clusterEntries = [...clusters.entries()];

  const nodes: GraphNode[] = clusterEntries.flatMap(([clusterId, clusterSubmissions], index) => {
    const angle = (Math.PI * 2 * index) / Math.max(clusterEntries.length, 1);
    const centerX = Math.cos(angle) * 280;
    const centerY = Math.sin(angle) * 180;
    const color = palette[index % palette.length];
    const label = clusterLabelFromKeywords(clusterSubmissions[0]?.keywords ?? [clusterId]);

    return clusterSubmissions.map((submission, nodeIndex) => {
      const normalizedScore = Math.max(0, Math.min(1, submission.qualityScore));
      const scale = 0.85 + normalizedScore * 0.5;
      const radius = 110 + (nodeIndex % 3) * 34;
      const localAngle = angle + (Math.PI * 2 * nodeIndex) / Math.max(clusterSubmissions.length, 1);

      return {
        id: submission.id,
        type: 'reasoning',
        position: {
          x: centerX + Math.cos(localAngle) * radius,
          y: centerY + Math.sin(localAngle) * radius,
        },
        data: {
          submission,
          label,
          color,
          scale,
        },
      };
    });
  });

  const edges = submissions.flatMap((submission, index) =>
    submissions.slice(index + 1).flatMap((candidate) => {
      const similarity = keywordSimilarity(submission.keywords, candidate.keywords);

      if (similarity < 0.2) {
        return [];
      }

      return [
        {
          id: `edge-${submission.id}-${candidate.id}`,
          source: submission.id,
          target: candidate.id,
          style: {
            stroke: similarity > 0.34 ? '#6467f2' : '#475569',
            strokeWidth: similarity > 0.34 ? 2 : 1,
          },
          animated: similarity > 0.34,
        },
      ];
    }),
  );

  return { nodes, edges };
}

export function ReasoningGraph({
  submissions,
  selectedSubmissionId,
  onSelectSubmission,
}: {
  submissions: ReasoningSubmission[];
  selectedSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
}) {
  const { nodes, edges } = buildGraph(submissions);

  if (submissions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 px-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Graph Waiting</p>
          <h3 className="text-2xl font-bold text-slate-100">No reasoning nodes yet</h3>
          <p className="text-sm leading-relaxed text-slate-400">
            Verified participants will appear here as soon as they submit their premises and
            conclusion. Cluster formation happens automatically from shared reasoning themes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      fitView
      minZoom={0.4}
      maxZoom={1.8}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      elementsSelectable
      onNodeClick={(_, node) => onSelectSubmission(node.id)}
      defaultEdgeOptions={{ type: 'smoothstep' }}
      className="bg-transparent"
    >
      <MiniMap
        pannable
        zoomable
        nodeStrokeColor={(node) => {
          if (node.id === selectedSubmissionId) {
            return '#f8fafc';
          }

          return (node.data as GraphNodeData).color;
        }}
        nodeColor={(node) => `${(node.data as GraphNodeData).color}88`}
        maskColor="#02061788"
        position="top-right"
      />
      <Controls className="!border-slate-800 !bg-slate-950/90 !text-slate-200" showInteractive={false} />
      <Background color="#334155" gap={24} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
