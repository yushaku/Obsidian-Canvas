/* eslint-disable @typescript-eslint/no-explicit-any */
import { around } from 'monkey-around';
import { CanvasNode, ItemView, Plugin, TFile } from 'obsidian';
import {
  DEFAULT_SETTINGS,
  MindMapSettings,
  MindMapSettingTab,
} from './mindMapSettings';
import { ModifierKey } from './types';
import {
  createChildFileNode,
  createChildNode,
  createFloatingNode,
  createSiblingNode,
  navigate,
} from './utils';

export default class CanvasMindMap extends Plugin {
  settings: MindMapSettings;
  settingTab: MindMapSettingTab;

  async onload() {
    await this.registerSettings();
    this.registerCommands();
    this.patchCanvas();
    this.patchMarkdownFileInfo();
    this.patchCanvasNode();
  }

  onunload() {}

  async registerSettings() {
    this.settingTab = new MindMapSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    await this.loadSettings();
  }

  registerCommands() {
    this.addCommand({
      id: 'split-heading-into-mindmap',
      name: 'Split Heading into mindmap based on H1',
      checkCallback: (checking: boolean) => {
        const canvasView = app.workspace.getActiveViewOfType(ItemView);
        if (!canvasView) return;

        if (canvasView.getViewType() === 'canvas') {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.

          if (!checking) {
            // @ts-ignore
            const canvas = canvasView.canvas;

            const currentSelection = canvas?.selection;
            if (currentSelection.size > 1) {
              return;
            }

            const currentSelectionItem = currentSelection.values().next().value;
            if (!currentSelectionItem.filePath) return;

            const currentSelectionItemFile = currentSelectionItem.file as TFile;
            if (!(currentSelectionItemFile.extension === 'md')) return;

            const currentFileHeadings = app.metadataCache.getFileCache(
              currentSelectionItemFile,
            )?.headings;
            if (!currentFileHeadings) return;

            const currentFileHeadingH1 = currentFileHeadings.filter(
              (heading) => heading.level === 1,
            );
            if (currentFileHeadingH1.length === 0) return;

            const nodeGroupHeight =
              (currentSelectionItem.height * 0.6 + 20) *
              currentFileHeadingH1.length;
            const direction = -1;
            const nodeGroupY =
              currentSelectionItem.y +
              currentSelectionItem.height / 2 +
              (nodeGroupHeight / 2) * direction;

            currentFileHeadingH1.forEach((item, index) => {
              createChildFileNode(
                canvas,
                currentSelectionItem,
                currentSelectionItemFile,
                '#' + item.heading,
                nodeGroupY -
                  direction * (currentSelectionItem.height * 0.6 + 20) * index,
              );
            });
          }
          return true;
        }
      },
    });

    this.addCommand({
      id: 'create-floating-node',
      name: 'Create floating node',
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            // @ts-ignore
            const canvas = canvasView?.canvas;

            const node = canvas.createTextNode({
              pos: {
                x: 0,
                y: 0,
                height: 500,
                width: 400,
              },
              size: {
                x: 0,
                y: 0,
                height: 500,
                width: 400,
              },
              text: '',
              focus: true,
              save: true,
            });

            canvas.addNode(node);
            canvas.requestSave();
            if (!node) return;

            setTimeout(() => {
              node.startEditing();
              canvas.zoomToSelection();
            }, 0);
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      },
    });

    this.addCommand({
      id: 'create-child-node',
      name: 'Create child node',
      checkCallback: (checking: boolean) => {
        // const view = this.app.workspace.getActiveViewOfType(ItemView);
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          if (!checking) {
            // @ts-ignore
            const canvas = canvasView?.canvas;

            createChildNode(canvas, true).then((node) => {
              if (!node) return;

              setTimeout(() => {
                const realNode = canvas.nodes?.get(node.id);
                canvas.zoomToSelection();

                realNode?.startEditing();
              }, 0);
            });
          }

          return true;
        }
      },
    });

    this.addCommand({
      id: 'create-sibling-node',
      name: 'Create sibling node',
      checkCallback: (checking: boolean) => {
        // const view = this.app.workspace.getActiveViewOfType(ItemView);
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          if (!checking) {
            // @ts-ignore
            const canvas = canvasView?.canvas;

            createSiblingNode(canvas, true).then((node) => {
              if (!node) return;

              setTimeout(() => {
                // @ts-ignore
                const realNode = canvas.nodes?.get(node.id);
                canvas.zoomToSelection();

                realNode?.startEditing();
              }, 0);
            });
          }

          return true;
        }
      },
    });
  }

  patchCanvas() {
    const patchCanvas = () => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      const canvasView = this.app.workspace.getLeavesOfType('canvas').first()
        ?.view;
      // @ts-ignore
      const canvas = canvasView?.canvas;

      if (!canvasView) return false;
      const patchCanvasView = canvas.constructor;

      const canvasViewunistaller = around(canvasView.constructor.prototype, {
        onOpen: (next) =>
          async function () {
            if (self.settings.create.createFloat) {
              this.scope.register([ModifierKey.Mod], 'k', () => {
                createFloatingNode(this.canvas, 'top');
              });
              this.scope.register([ModifierKey.Mod], 'j', () => {
                createFloatingNode(this.canvas, 'bottom');
              });
              this.scope.register([ModifierKey.Mod], 'h', () => {
                createFloatingNode(this.canvas, 'left');
              });
              this.scope.register([ModifierKey.Mod], 'l', () => {
                createFloatingNode(this.canvas, 'right');
              });
            }

            if (self.settings.navigate.useNavigate) {
              this.scope.register([], 'k', () => {
                navigate(this.canvas, 'top');
              });
              this.scope.register([], 'j', () => {
                navigate(this.canvas, 'bottom');
              });
              this.scope.register([], 'h', () => {
                navigate(this.canvas, 'left');
              });
              this.scope.register([], 'l', () => {
                navigate(this.canvas, 'right');
              });
            }

            // NORMAL MODE: type i to edit
            this.scope.register([], 'i', async (ev: KeyboardEvent) => {
              const selection = this.canvas.selection;
              if (selection.size !== 1) return;

              const node = selection.entries().next().value[1] as CanvasNode;
              if (node?.label || node?.url) return;
              if (node.isEditing) return;

              node.startEditing();
            });

            this.scope.register([ModifierKey.Mod], 'l', async () => {
              const node = await createSiblingNode(this.canvas, false);
              if (!node) return;

              const realNode = this.canvas.nodes?.get(node.id);
              realNode?.startEditing();
              this.canvas.zoomToSelection();
            });

            this.scope.register([ModifierKey.Mod], 'j', async () => {
              const node = await createChildNode(this.canvas, false);
              if (!node) return;

              const realNode = this.canvas.nodes?.get(node.id);
              realNode?.startEditing();
              this.canvas.zoomToSelection();
            });

            this.scope.register([ModifierKey.Mod], 'z', async () => {
              this.canvas.zoomToFit();
            });

            return next.call(this);
          },
      });

      const uninstaller = around(patchCanvasView.prototype, {
        onKeydown: (next) =>
          async function (e: any) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
              if (this.selection.size !== 1) {
                return next.call(this, e);
              }
              const childNode = this.selection.entries().next().value[1];
              if (childNode.isEditing) return;

              const edges = this.getEdgesForNode(childNode).filter(
                (item: any) => {
                  return item.to.node.id === childNode.id;
                },
              );
              if (edges.length === 0) return;
              const parentNode = edges[0].from.node;

              next.call(this, e);

              let wholeHeight = 0;
              const parentEdges = this.getEdgesForNode(parentNode).filter(
                (item: any) => {
                  return (
                    item.from.node.id === parentNode.id &&
                    item.to.side === 'left'
                  );
                },
              );

              const allnodes = [];
              for (let i = 0; i < parentEdges.length; i++) {
                const node = parentEdges[i].to.node;
                allnodes.push(node);
                wholeHeight += node.height + 20;
              }
              allnodes.sort((a: any, b: any) => {
                return a.y - b.y;
              });

              // Check if this is a Mindmap
              if (allnodes.length === 1) return;
              if (allnodes.length > 1) {
                if (allnodes[0].x !== allnodes[0].x) {
                  return;
                }
              }

              let preNode;
              for (let i = 0; i < allnodes.length; i++) {
                let tempNode;
                if (i === 0) {
                  (tempNode = allnodes[i]).moveTo({
                    x: childNode.x,
                    y: parentNode.y + parentNode.height - wholeHeight / 2,
                  });
                } else {
                  (tempNode = allnodes[i]).moveTo({
                    x: childNode.x,
                    y: preNode.y + preNode.height + 20,
                  });
                }
                this.requestSave();
                preNode = tempNode;
              }

              this.requestSave();

              this.selectOnly(parentNode);
              this.zoomToSelection();
              parentNode.startEditing();

              return;
            }

            if (e.key === ' ') {
              const selection = this.selection;
              if (selection.size !== 1) return;
              const node = selection.entries().next().value[1];

              if (node?.label || node?.url) return;

              if (node.isEditing) return;
              node.startEditing();
            }

            next.call(this, e);
          },
      });
      this.register(uninstaller);
      this.register(canvasViewunistaller);

      canvas?.view.leaf.rebuildView();
      console.log('Obsidian-Canvas-MindMap: canvas view patched');
      return true;
    };

    this.app.workspace.onLayoutReady(() => {
      if (!patchCanvas()) {
        const evt = this.app.workspace.on('layout-change', () => {
          patchCanvas() && this.app.workspace.offref(evt);
        });
        this.registerEvent(evt);
      }
    });
  }

  patchCanvasNode() {
    const patchNode = () => {
      const canvasView = app.workspace.getLeavesOfType('canvas').first()?.view;
      // @ts-ignore
      const canvas = canvasView?.canvas;
      if (!canvas) return false;

      const node = Array.from(canvas.nodes).first();
      if (!node) return false;

      // @ts-ignore
      const nodeInstance = node[1];

      const uninstaller = around(nodeInstance.constructor.prototype, {
        setColor: (next: any) =>
          function (e: any, t: any) {
            next.call(this, e, t);
            this.canvas.getEdgesForNode(this).forEach((edge: any) => {
              if (edge.from.node === this) {
                edge.setColor(e, true);
                edge.render();
                // edge.to.node.setColor(e, true);
              }
            });
            canvas.requestSave();
          },
      });
      this.register(uninstaller);

      console.log('Obsidian-Canvas-MindMap: canvas node patched');
      return true;
    };

    this.app.workspace.onLayoutReady(() => {
      if (!patchNode()) {
        const evt = app.workspace.on('layout-change', () => {
          patchNode() && app.workspace.offref(evt);
        });
        this.registerEvent(evt);
      }
    });
  }

  patchMarkdownFileInfo() {
    const patchEditor = () => {
      const editorInfo = app.workspace.activeEditor;

      console.log(editorInfo);
      if (!editorInfo) return false;
      if (
        !editorInfo ||
        !editorInfo.containerEl ||
        editorInfo.containerEl.closest('.common-editor-inputer')
      )
        return false;

      const patchEditorInfo = editorInfo.constructor;

      const uninstaller = around(patchEditorInfo.prototype, {
        showPreview: (next) =>
          function (e: any) {
            next.call(this, e);
            if (e) {
              this.node?.canvas.wrapperEl.focus();
              this.node?.setIsEditing(false);
            }
          },
      });
      this.register(uninstaller);

      console.log('Obsidian-Canvas-MindMap: markdown file info patched');
      return true;
    };

    this.app.workspace.onLayoutReady(() => {
      if (!patchEditor()) {
        const evt = app.workspace.on('file-open', () => {
          setTimeout(() => {
            patchEditor() && app.workspace.offref(evt);
          }, 100);
        });
        this.registerEvent(evt);
      }
    });
  }

  public async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
