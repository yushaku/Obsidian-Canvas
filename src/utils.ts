/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Canvas,
  CanvasEdge,
  CanvasNode,
  EdgeT,
  TFile,
  TreeNode,
} from 'obsidian';
import {
  CanvasData,
  CanvasEdgeData,
  CanvasFileData,
  CanvasNodeData,
  CanvasTextData,
} from 'obsidian/canvas';

export const random = (e: number) => {
  const t = [];
  for (let n = 0; n < e; n++) {
    t.push(((16 * Math.random()) | 0).toString(16));
  }
  return t.join('');
};

export const createChildFileNode = (
  canvas: Canvas,
  parentNode: any,
  file: TFile,
  path: string,
  y: number,
) => {
  const node = addNode(canvas, random(16), {
    x: parentNode.x + parentNode.width + 200,
    y: y,
    width: parentNode.width,
    height: parentNode.height * 0.6,

    type: 'file',
    content: file.path,
    subpath: path,
  });

  addEdge(
    canvas,
    random(16),
    {
      fromOrTo: 'from',
      side: 'right',
      node: parentNode,
    },
    {
      fromOrTo: 'to',
      side: 'left',
      node: <CanvasNodeData>node,
    },
  );

  canvas.requestSave();

  return node;
};

export const addNode = (
  canvas: Canvas,
  id: string,
  {
    x,
    y,
    width,
    height,
    type,
    content,
    subpath,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'text' | 'file';
    content: string;
    subpath?: string;
  },
) => {
  if (!canvas) return;

  const data = canvas.getData();
  if (!data) return;

  const node: Partial<CanvasTextData | CanvasFileData> = {
    id: id,
    x: x,
    y: y,
    width: width,
    height: height,
    type: type,
  };

  switch (type) {
    case 'text':
      node.text = content;
      break;
    case 'file':
      node.file = content;
      if (subpath) node.subpath = subpath;
      break;
  }

  canvas.importData(<CanvasData>{
    nodes: [...data.nodes, node],
    edges: data.edges,
  });

  canvas.requestFrame();

  return node;
};

export const addEdge = (
  canvas: any,
  edgeID: string,
  fromEdge: EdgeT,
  toEdge: EdgeT,
) => {
  if (!canvas) return;

  const data = canvas.getData();
  if (!data) return;

  canvas.importData({
    edges: [
      ...data.edges,
      {
        id: edgeID,
        fromNode: fromEdge.node.id,
        fromSide: fromEdge.side,
        toNode: toEdge.node.id,
        toSide: toEdge.side,
      },
    ],
    nodes: data.nodes,
  });

  canvas.requestFrame();
};

export function buildTrees(
  canvasData: CanvasData,
  direction: 'LR' | 'RL' | 'TB' | 'BT',
): TreeNode[] {
  const trees: TreeNode[] = [];
  const nodeMap: Map<string, TreeNode> = new Map();
  const edgeMap: Map<string, string[]> = new Map();

  canvasData.nodes.forEach((node) => {
    nodeMap.set(node.id, {
      ...node,
      children: [],
    });
  });

  canvasData.edges.forEach((edge) => {
    if (!edgeMap.has(edge.fromNode)) {
      edgeMap.set(edge.fromNode, []);
    }
    edgeMap.get(edge.fromNode)?.push(edge.toNode);
  });

  const rootNodes = canvasData.nodes.filter(
    (node) => !canvasData.edges.some((edge) => edge.toNode === node.id),
  );

  rootNodes.forEach((rootNode) => {
    const tree = buildTree(rootNode.id, edgeMap, nodeMap, direction);
    trees.push(tree);
  });

  return trees;
}

function buildTree(
  nodeId: string,
  edgeMap: Map<string, string[]>,
  nodeMap: Map<string, TreeNode>,
  direction: 'LR' | 'RL' | 'TB' | 'BT',
): TreeNode {
  const node = nodeMap.get(nodeId) as TreeNode;

  edgeMap.get(nodeId)?.forEach((childId) => {
    if (shouldAddChild(nodeId, childId, direction, nodeMap)) {
      node.children.push(buildTree(childId, edgeMap, nodeMap, direction));
    }
  });
  return node;
}

function shouldAddChild(
  parentId: string,
  childId: string,
  direction: 'LR' | 'RL' | 'TB' | 'BT',
  nodeMap: Map<string, TreeNode>,
): boolean {
  const parent = nodeMap.get(parentId) as unknown as CanvasNodeData;
  const child = nodeMap.get(childId) as unknown as CanvasNodeData;

  switch (direction) {
    case 'LR':
      return parent.x < child.x;
    case 'RL':
      return parent.x > child.x;
    case 'TB':
      return parent.y < child.y;
    case 'BT':
      return parent.y > child.y;
    default:
      return true;
  }
}

export const createEdge = async (node1: any, node2: any, canvas: Canvas) => {
  addEdge(
    canvas,
    random(16),
    {
      fromOrTo: 'from',
      side: 'right',
      node: node1,
    },
    {
      fromOrTo: 'to',
      side: 'left',
      node: node2,
    },
  );
};

export const navigate = (canvas: Canvas, direction: string) => {
  console.log(canvas);

  const currentSelection = canvas.selection;
  if (currentSelection.size !== 1) return;

  // Check if the selected node is editing
  if (currentSelection.values().next().value.isEditing) return;

  const selectedItem = currentSelection.values().next().value as CanvasNode;
  const viewportNodes = canvas.getViewportNodes();
  const { x, y, width, height } = selectedItem;

  canvas.deselectAll();

  const isVertical = direction === 'top' || direction === 'bottom';
  const comparePrimary = isVertical
    ? (a: CanvasNode, b: CanvasNode) => a.y - b.y
    : (a: CanvasNode, b: CanvasNode) => a.x - b.x;
  const compareSecondary = isVertical
    ? (a: CanvasNode, b: CanvasNode) => a.x - b.x
    : (a: CanvasNode, b: CanvasNode) => a.y - b.y;
  const filterCondition = (node: CanvasNode) => {
    const inRange = isVertical
      ? node.x < x + width / 2 && node.x + node.width > x + width / 2
      : node.y < y + height / 2 && node.y + node.height > y + height / 2;
    const directionCondition =
      direction === 'top'
        ? node.y < y
        : direction === 'bottom'
        ? node.y > y
        : direction === 'left'
        ? node.x < x
        : node.x > x;
    return inRange && directionCondition;
  };

  const filteredNodes = viewportNodes.filter(filterCondition);
  const sortedNodes =
    filteredNodes.length > 0
      ? filteredNodes.sort(comparePrimary)
      : viewportNodes
          .filter((node: CanvasNode) =>
            direction === 'top'
              ? node.y < y
              : direction === 'bottom'
              ? node.y > y
              : direction === 'left'
              ? node.x < x
              : node.x > x,
          )
          .sort(compareSecondary);
  const nextNode = sortedNodes[0];

  if (nextNode) {
    canvas.selectOnly(nextNode);
    canvas.zoomToSelection();
  }

  return nextNode;
};

export const createFloatingNode = (canvas: any, direction: string) => {
  const selection = canvas.selection;

  if (selection.size !== 1) return;
  // Check if the selected node is editing
  if (selection.values().next().value.isEditing) return;

  const node = selection.values().next().value;
  const x =
    direction === 'left'
      ? node.x - node.width - 50
      : direction === 'right'
      ? node.x + node.width + 50
      : node.x;
  const y =
    direction === 'top'
      ? node.y - node.height - 100
      : direction === 'bottom'
      ? node.y + node.height + 100
      : node.y;

  const tempChildNode = addNode(canvas, random(16), {
    x: x,
    y: y,
    width: node.width,
    height: node.height,
    type: 'text',
    content: '',
  });
  if (!tempChildNode) return;

  canvas?.requestSave();

  const currentNode = canvas.nodes?.get(tempChildNode.id);
  if (!currentNode) return;

  canvas.selectOnly(currentNode);
  canvas.zoomToSelection();

  setTimeout(() => {
    currentNode.startEditing();
  }, 100);

  return tempChildNode;
};

export const childNode = async (
  canvas: Canvas,
  parentNode: CanvasNode,
  y: number,
) => {
  const tempChildNode = addNode(canvas, random(16), {
    x: parentNode.x + parentNode.width + 200,
    y: y,
    width: parentNode.width,
    height: parentNode.height,
    type: 'text',
    content: '',
  });
  await createEdge(parentNode, tempChildNode, canvas);
  if (!tempChildNode) return;

  canvas.deselectAll();
  const node = canvas.nodes?.get(tempChildNode.id ?? '');
  if (!node) return;
  canvas.selectOnly(node);

  canvas.requestSave();

  return tempChildNode;
};

export const createChildNode = async (canvas: Canvas, ignored: boolean) => {
  if (canvas.selection.size !== 1) return;
  const parentNode = canvas.selection.entries().next().value[1];

  if (parentNode.isEditing && !ignored) return;

  // Calculate the height of all the children nodes
  // const wholeHeight = 0;
  let tempChildNode;
  const canvasData = canvas.getData();

  const prevParentEdges = canvasData.edges.filter((item: CanvasEdgeData) => {
    return item.fromNode === parentNode.id && item.toSide === 'left';
  });

  if (prevParentEdges.length === 0) {
    tempChildNode = await childNode(canvas, parentNode, parentNode.y);
  } else {
    tempChildNode = await siblingNode(canvas, parentNode, prevParentEdges);
  }

  return tempChildNode;
};

const siblingNode = async (
  canvas: Canvas,
  parentNode: CanvasNode,
  prevParentEdges: CanvasEdgeData[],
) => {
  const allEdges = canvas
    .getEdgesForNode(parentNode)
    .filter((item: CanvasEdge) => {
      return prevParentEdges.some((edge: CanvasEdgeData) => {
        return item.to.node.id === edge.toNode;
      });
    });

  const allNodes = allEdges.map((edge: CanvasEdge) => edge.to.node);
  allNodes.sort((a, b) => a.y - b.y);
  const lastNode = allNodes[allNodes.length - 1];
  canvas.selectOnly(lastNode);
  return await createSiblingNode(canvas, false);
};

export const createSiblingNode = async (canvas: Canvas, ignored: boolean) => {
  if (canvas.selection.size !== 1) return;
  const selectedNode = canvas.selection.entries().next().value[1];

  if (selectedNode.isEditing && !ignored) return;

  const incomingEdges = canvas
    .getEdgesForNode(selectedNode)
    .filter((edge: CanvasEdge) => edge.to.node.id === selectedNode.id);
  if (incomingEdges.length === 0) return;
  const parentNode = incomingEdges[0].from.node;

  const newYPosition = selectedNode.y + selectedNode.height / 2 + 110;
  const newChildNode = await childNode(canvas, parentNode, newYPosition);

  const leftSideEdges = canvas
    .getEdgesForNode(parentNode)
    .filter(
      (edge: CanvasEdge) =>
        edge.from.node.id === parentNode.id && edge.to.side === 'left',
    );

  const nodes = leftSideEdges.map((edge: CanvasEdge) => edge.to.node);
  const totalHeight = nodes.reduce(
    (acc: number, node: CanvasNode) => acc + node.height + 20,
    0,
  );

  nodes.sort((a, b) => a.y - b.y);

  if (nodes.length <= 1) return;
  if (nodes.length > 1 && nodes[0].x === nodes[1]?.x) {
    nodes.forEach((node: CanvasNode, index: number) => {
      const yPos =
        index === 0
          ? parentNode.y + parentNode.height / 2 - totalHeight / 2
          : nodes[index - 1].y + nodes[index - 1].height + 20;
      node.moveTo({ x: selectedNode.x, y: yPos });
    });
  }

  canvas.requestSave();
  return newChildNode;
};
