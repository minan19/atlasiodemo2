"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useI18n } from "../_i18n/use-i18n";

type Point = { x: number; y: number };
export type WhiteboardTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "note"
  | "image"
  | "table"
  | "laser"
  | "spotlight"
  | "fill"
  | "picker"
  | "pan"
  | "lasso"
  | "move"
  | "cursor"
  | "math"
  | "triangle"
  | "star"
  | "pentagon";

type EraserMode = "pixel" | "object";

export type WhiteboardLocalHandle = {
  setTool: (t: WhiteboardTool) => void;
  setColor: (c: string) => void;
  setWidth: (w: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  download: () => void;
  addNote: (text: string) => void;
  addText: (text: string) => void;
  addTable: (rows: number, cols: number, data?: string[][]) => void;
  addImageFromFile: (file: File) => void;
  setMove: () => void;
  addPage: () => void;
  deletePage: (idx: number) => void;
  goToPage: (idx: number) => void;
  getPageCount: () => number;
  getCurrentPage: () => number;
  openCalculator: () => void;
};

type Props = {
  background?: string;
  showControls?: boolean;
  tool?: WhiteboardTool;
  eraserMode?: EraserMode;
  color?: string;
  width?: number;
  onReady?: () => void;
  onColorPick?: (color: string) => void;
  onTextEditChange?: (editing: boolean, props?: { fontSize: number; bold: boolean; italic: boolean; fontFamily: string; color: string }) => void;
  onToolChange?: (t: WhiteboardTool) => void;
};

type FabricType = any;

export const WhiteboardLocal = forwardRef<WhiteboardLocalHandle, Props>(function WhiteboardLocal(
  {
    background,
    showControls = true,
    tool: toolProp,
    eraserMode: eraserModeProp,
    color: colorProp,
    width: widthProp,
    onReady,
    onColorPick,
    onTextEditChange,
    onToolChange,
  },
  ref,
) {
  const t = useI18n();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<any>(null);
  const fabricRef = useRef<FabricType | null>(null);
  const [tool, setTool] = useState<WhiteboardTool>(toolProp ?? "pen");
  const [color, setColor] = useState(colorProp ?? "#0f172a");
  const [width, setWidth] = useState(widthProp ?? 3);
  const [eraserMode, setEraserMode] = useState<EraserMode>(eraserModeProp ?? "pixel");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isRestoring = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressHistory = useRef(false);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const shapeRef = useRef<any>(null);
  const arrowHeadRef = useRef<any>(null);
  const drawingShape = useRef(false);
  const startRef = useRef<Point | null>(null);
  const lastTextPos = useRef<Point | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  } | null>(null);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const palette = ["#0f172a", "#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#f43f5e", "#14b8a6"];
  const clipboardRef = useRef<any>(null);
  const toolRef = useRef<WhiteboardTool>(tool);
  const eraserModeRef = useRef<EraserMode>(eraserMode);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const cursorRef = useRef<string>("default");
  const isPanning = useRef(false);
  const lastPan = useRef<Point | null>(null);
  const [objectCount, setObjectCount] = useState(0);
  const pagesRef = useRef<string[]>([]);
  const currentPageIdxRef = useRef(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [mathModal, setMathModal] = useState<{ x: number; y: number } | null>(null);
  const [mathInput, setMathInput] = useState("");
  const mathCanvasPosRef = useRef<{ x: number; y: number } | null>(null);
  const [noteModal, setNoteModal] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcExpr, setCalcExpr] = useState("");
  const [calcResult, setCalcResult] = useState("");
  const [textProps, setTextProps] = useState<{
    fontSize: number; bold: boolean; italic: boolean; fontFamily: string;
    underline: boolean; linethrough: boolean; textAlign: string; color: string;
  } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      setTool: (t) => setTool(t),
      setColor: (c) => setColor(c),
      setWidth: (w) => setWidth(w),
      setMove: () => setTool("move"),
      undo: () => doUndo(),
      redo: () => doRedo(),
      clear: () => doClear(),
      download: () => downloadPng(),
      addNote: (text: string) => addNote(text),
      addText: (text: string) => addText(text),
      addTable: (rows: number, cols: number, data?: string[][]) => addTable(rows, cols, data),
      addImageFromFile: (file: File) => addImageFromFile(file),
      addPage: () => addPage(),
      deletePage: (idx: number) => deletePage(idx),
      goToPage: (idx: number) => goToPage(idx),
      getPageCount: () => pagesRef.current.length,
      getCurrentPage: () => currentPageIdxRef.current,
      openCalculator: () => setCalcOpen(v => !v),
    }),
    [color, width],
  );

  // Sync tool from parent prop only when parent changes it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof toolProp !== "undefined") {
      setTool(toolProp);
    }
  }, [toolProp]);

  useEffect(() => {
    if (typeof colorProp !== "undefined" && colorProp !== color) {
      setColor(colorProp);
    }
  }, [colorProp, color]);

  useEffect(() => {
    if (typeof widthProp !== "undefined" && widthProp !== width) {
      setWidth(widthProp);
    }
  }, [widthProp, width]);

  useEffect(() => {
    if (typeof eraserModeProp !== "undefined" && eraserModeProp !== eraserMode) {
      setEraserMode(eraserModeProp);
    }
  }, [eraserModeProp, eraserMode]);

  useEffect(() => {
    let mounted = true;
    const cleanupFns: (() => void)[] = [];

    (async () => {
      try {
        const mod = await import("fabric");
        const fabric = (mod as any).fabric ?? (mod as any).default ?? mod;
        if (!fabric?.Canvas) {
          setLoadError("Fabric modülü yüklenemedi.");
          return;
        }
      if (!mounted) return;
      fabricRef.current = fabric;

      const canvasEl = canvasElRef.current;
      if (!canvasEl) return;
      const canvas = new fabric.Canvas(canvasEl, {
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: true,
      });
      (canvasEl as any).__atlasCanvas = canvas;
      if (typeof window !== "undefined") {
        (window as any).__atlasCanvas = canvas;
      }
      canvasRef.current = canvas;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      const resizeCanvas = () => {
        const host = containerRef.current;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.setWidth(rect.width);
          canvas.setHeight(rect.height);
          canvas.calcOffset();
          canvas.requestRenderAll();
        }
      };
      resizeCanvas();
      requestAnimationFrame(resizeCanvas);
      const ro = new ResizeObserver(resizeCanvas);
      if (containerRef.current) ro.observe(containerRef.current);
      window.addEventListener("resize", resizeCanvas);

      // Selection style
      canvas.selectionColor = "rgba(59,130,246,0.12)";
      canvas.selectionBorderColor = "#60a5fa";
      canvas.selectionLineWidth = 1;
      canvas.selectionDashArray = [6, 4];

      const applyObjectStyle = (obj: any) => {
        obj.set({
          cornerStyle: "circle",
          cornerColor: "#38bdf8",
          cornerStrokeColor: "#0f172a",
          borderColor: "#60a5fa",
          borderDashArray: [6, 4],
          transparentCorners: false,
          padding: 6,
        });
      };

      const saveHistory = () => {
        if (isRestoring.current || suppressHistory.current) return;
        const json = JSON.stringify(canvas.toJSON());
        const stack = historyRef.current;
        if (stack.length > 0 && stack[stack.length - 1] === json) return;
        stack.push(json);
        if (stack.length > 60) stack.shift();
        redoRef.current = [];
        setObjectCount(canvas.getObjects().length);
      };

      const initHistory = () => {
        historyRef.current = [JSON.stringify(canvas.toJSON())];
        redoRef.current = [];
        setObjectCount(canvas.getObjects().length);
        pagesRef.current = [JSON.stringify(canvas.toJSON())];
      };

      canvas.on("object:added", (e: any) => {
        if (e?.target) applyObjectStyle(e.target);
        saveHistory();
      });
      const finalizeFreeDraw = (path: any) => {
        // Pixel eraser path — keep destination-out composite, don't recolor
        if (toolRef.current === "eraser" && eraserModeRef.current === "pixel") {
          path.set({
            selectable: false,
            evented: false,
            globalCompositeOperation: "destination-out",
            stroke: "rgba(0,0,0,1)",
            strokeWidth: widthRef.current * 2,
          });
          const objs = canvas.getObjects();
          if (!objs.includes(path)) canvas.add(path);
          canvas.requestRenderAll();
          saveHistory();
          return;
        }
        applyObjectStyle(path);
        path.set({
          selectable: true,
          evented: true,
          stroke: colorRef.current,
          strokeWidth: widthRef.current,
        });
        const objs = canvas.getObjects();
        if (!objs.includes(path)) {
          canvas.add(path);
        }
        canvas.requestRenderAll();
        saveHistory();
      };

      canvas.on("path:created", (e: any) => {
        if (!e?.path) return;
        const path = e.path;

        // Smart Shape Morph — only for pen tool
        if (toolRef.current === "pen") {
          try {
            const points: Array<[number, number]> = [];
            const pathData = path.path ?? [];
            for (const cmd of pathData) {
              if (cmd.length >= 3) points.push([cmd[cmd.length - 2], cmd[cmd.length - 1]]);
            }
            if (points.length >= 4) {
              const xs = points.map(p => p[0]);
              const ys = points.map(p => p[1]);
              const minX = Math.min(...xs), maxX = Math.max(...xs);
              const minY = Math.min(...ys), maxY = Math.max(...ys);
              const bboxW = maxX - minX, bboxH = maxY - minY;
              const area = bboxW * bboxH;

              if (area > 400) {
                const first = points[0], last = points[points.length - 1];
                const closedDist = Math.hypot(last[0] - first[0], last[1] - first[1]);
                const isClosed = closedDist < Math.max(bboxW, bboxH) * 0.25;
                const aspect = bboxW / (bboxH || 1);

                // Count direction changes (corners)
                let corners = 0;
                const seg = Math.max(1, Math.floor(points.length / 10));
                for (let i = seg; i < points.length - seg; i += seg) {
                  const prev = points[i - seg], curr = points[i], next = points[i + seg];
                  const a1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
                  const a2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
                  const diff = Math.abs(a2 - a1);
                  if (diff > 0.6 && diff < Math.PI * 1.5) corners++;
                }

                let morphed = false;
                const f = fabricRef.current;
                const c = canvasRef.current;
                if (!f || !c) { finalizeFreeDraw(path); return; }

                if (isClosed && corners >= 3 && corners <= 6 && aspect > 0.4 && aspect < 2.5) {
                  // Rectangle
                  c.remove(path);
                  const rect = new f.Rect({
                    left: minX, top: minY, width: bboxW, height: bboxH,
                    fill: "transparent", stroke: colorRef.current,
                    strokeWidth: widthRef.current, selectable: true, evented: true,
                  });
                  c.add(rect);
                  c.setActiveObject(rect);
                  morphed = true;
                } else if (isClosed && corners < 3) {
                  // Ellipse
                  c.remove(path);
                  const ellipse = new f.Ellipse({
                    left: minX + bboxW / 2, top: minY + bboxH / 2,
                    rx: bboxW / 2, ry: bboxH / 2,
                    fill: "transparent", stroke: colorRef.current,
                    strokeWidth: widthRef.current, selectable: true, evented: true,
                    originX: "center", originY: "center",
                  });
                  c.add(ellipse);
                  c.setActiveObject(ellipse);
                  morphed = true;
                } else if (!isClosed && corners <= 1) {
                  // Line
                  c.remove(path);
                  const line = new f.Line([first[0], first[1], last[0], last[1]], {
                    stroke: colorRef.current, strokeWidth: widthRef.current,
                    selectable: true, evented: true,
                  });
                  c.add(line);
                  c.setActiveObject(line);
                  morphed = true;
                }

                if (morphed) {
                  c.requestRenderAll();
                  saveHistory();
                  return;
                }
              }
            }
          } catch (_) { /* morph failed, fall through to normal */ }
        }

        finalizeFreeDraw(path);
      });
      canvas.on("object:modified", saveHistory);
      canvas.on("object:removed", saveHistory);

      const updateSelectionUI = () => {
        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects.length) {
          setSelectionBox(null);
          setSelectionLocked(false);
          return;
        }
        const active = canvas.getActiveObject() ?? activeObjects[0];
        const rect = active.getBoundingRect(true, true);
        const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
        const left = rect.left * vpt[0] + vpt[4];
        const top = rect.top * vpt[3] + vpt[5];
        const width = rect.width * vpt[0];
        const height = rect.height * vpt[3];
        const canvasEl = canvas.getElement();
        const bounds = canvasEl.getBoundingClientRect();
        setSelectionBox({
          left,
          top,
          width,
          height,
          viewportWidth: bounds.width,
          viewportHeight: bounds.height,
        });
        const locked = activeObjects.every(
          (obj: any) => obj.lockMovementX && obj.lockMovementY && obj.lockRotation && obj.lockScalingX && obj.lockScalingY,
        );
        setSelectionLocked(locked);
      };

      canvas.on("selection:created", updateSelectionUI);
      canvas.on("selection:updated", updateSelectionUI);
      canvas.on("selection:cleared", () => {
        setSelectionBox(null);
        setSelectionLocked(false);
      });

      const updateTextProps = () => {
        const active = canvas.getActiveObject() as any;
        if (active && (active.type === "textbox" || active.type === "i-text" || active.type === "text")) {
          setTextProps({
            fontSize: active.fontSize ?? 22,
            bold: active.fontWeight === "bold",
            italic: active.fontStyle === "italic",
            fontFamily: active.fontFamily ?? "Inter",
            underline: !!active.underline,
            linethrough: !!active.linethrough,
            textAlign: active.textAlign ?? "left",
            color: (typeof active.fill === "string" ? active.fill : null) ?? colorRef.current,
          });
        } else {
          setTextProps(null);
        }
      };
      canvas.on("selection:created", updateTextProps);
      canvas.on("selection:updated", updateTextProps);
      canvas.on("selection:cleared", () => {
        setTextProps(null);
        onTextEditChange?.(false);
      });
      canvas.on("text:editing:entered", (e: any) => {
        const obj = e.target ?? canvas.getActiveObject() as any;
        if (!obj) return;
        onTextEditChange?.(true, {
          fontSize: obj.fontSize ?? 22,
          bold: obj.fontWeight === "bold",
          italic: obj.fontStyle === "italic",
          fontFamily: obj.fontFamily ?? "Inter",
          color: obj.fill ?? colorRef.current,
        });
      });
      canvas.on("text:editing:exited", () => {
        onTextEditChange?.(false);
        // Auto-switch to cursor/move mode so user can immediately
        // click and drag the text object they just finished editing
        setTool("cursor");
        onToolChange?.("cursor");
      });
      canvas.on("object:moving", updateSelectionUI);
      canvas.on("object:scaling", updateSelectionUI);
      canvas.on("object:rotating", updateSelectionUI);

      const deleteSelection = () => {
        const active = canvas.getActiveObjects();
        if (!active.length) return;
        active.forEach((obj: any) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        saveHistory();
      };

      const applyToSelection = (fn: (obj: any) => void) => {
        const active = canvas.getActiveObjects();
        if (!active.length) return;
        active.forEach(fn);
        canvas.requestRenderAll();
      };

      const duplicateSelection = () => {
        const active = canvas.getActiveObjects();
        if (!active.length) return;
        active.forEach((obj: any) => {
          obj.clone((cloned: any) => {
            cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
            canvas.add(cloned);
          });
        });
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      };

      const copySelection = () => {
        const active = canvas.getActiveObjects();
        if (!active.length) return;
        if (active.length === 1) {
          active[0].clone((cloned: any) => {
            clipboardRef.current = cloned;
          });
          return;
        }
        const group = new fabric.ActiveSelection(active, { canvas });
        group.clone((cloned: any) => {
          clipboardRef.current = cloned;
        });
      };

      const pasteSelection = () => {
        const stored = clipboardRef.current;
        if (!stored) return;
        stored.clone((cloned: any) => {
          cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
          if (cloned.type === "activeSelection") {
            cloned.canvas = canvas;
            cloned.forEachObject((obj: any) => canvas.add(obj));
            cloned.setCoords();
          } else {
            canvas.add(cloned);
          }
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        });
      };

      const bringToFront = () => applyToSelection((obj) => canvas.bringToFront(obj));
      const sendToBack = () => applyToSelection((obj) => canvas.sendToBack(obj));

      const lockSelection = () => {
        applyToSelection((obj) => {
          obj.set({
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
        });
        setSelectionLocked(true);
      };

      const unlockSelection = () => {
        applyToSelection((obj) => {
          obj.set({
            lockMovementX: false,
            lockMovementY: false,
            lockScalingX: false,
            lockScalingY: false,
            lockRotation: false,
          });
        });
        setSelectionLocked(false);
      };

      const applyTextProp = (prop: string, value: any) => {
        const active = canvas.getActiveObjects() as any[];
        active.forEach(obj => {
          if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
            obj.set({ [prop]: value });
          } else if (obj._objects) {
            obj._objects.forEach((child: any) => {
              if (child.type === "textbox" || child.type === "i-text" || child.type === "text") {
                child.set({ [prop]: value });
              }
            });
          }
        });
        canvas.requestRenderAll();
        saveHistory();
      };

      const recolorSelection = (nextColor: string) =>
        applyToSelection((obj) => {
          const type = obj.type;
          if (type === "textbox" || type === "i-text" || type === "text") {
            obj.set({ fill: nextColor });
            return;
          }
          if (obj.type === "group" && obj._objects) {
            obj._objects.forEach((child: any) => {
              if (child.type === "textbox" || child.type === "i-text" || child.type === "text") {
                child.set({ fill: nextColor });
              } else if (child.stroke) {
                child.set({ stroke: nextColor, fill: child.fill ?? "transparent" });
              } else {
                child.set({ fill: nextColor });
              }
            });
            return;
          }
          if (obj.stroke) {
            obj.set({ stroke: nextColor });
          } else {
            obj.set({ fill: nextColor });
          }
        });

      const keyHandler = (e: KeyboardEvent) => {
        // Don't intercept keys while a Fabric.js IText/Textbox is in edit mode.
        const activeObj = canvasRef.current?.getActiveObject() as any;
        const isEditingText = activeObj?.isEditing === true;

        // Ctrl/Cmd+A — In a drawing app, Ctrl+A should select all canvas objects.
        // Without this handler the browser fires its default "select all DOM text"
        // which draws a blue selection rectangle over button labels — visually
        // indistinguishable from a drawn shape, confusing users during drawing.
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          if (!isEditingText && canvasRef.current) {
            canvasRef.current.discardActiveObject();
            const all = canvasRef.current.getObjects();
            if (all.length > 0) {
              const sel = new (fabricRef.current as any).ActiveSelection(all, { canvas: canvasRef.current });
              canvasRef.current.setActiveObject(sel);
              canvasRef.current.requestRenderAll();
            }
          }
          return;
        }

        if (e.key === "Delete" || e.key === "Backspace") {
          if (!isEditingText) deleteSelection();
        }
        if (!isEditingText && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) doRedo();
          else doUndo();
        }
        if (!isEditingText && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicateSelection();
        }
        if (!isEditingText && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          copySelection();
        }
        if (!isEditingText && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
          e.preventDefault();
          pasteSelection();
        }

        // Escape: exit IText editing mode without discarding selection
        if (!isEditingText && e.key === "Escape") {
          canvasRef.current?.discardActiveObject();
          canvasRef.current?.requestRenderAll();
        }
      };
      window.addEventListener("keydown", keyHandler);

      const setToolMode = (nextTool: WhiteboardTool) => {
        if (!canvasRef.current) return;
        const c = canvasRef.current;
        toolRef.current = nextTool;
        const eraserIsPixel = nextTool === "eraser" && eraserModeRef.current === "pixel";
        if (nextTool === "pen" || nextTool === "highlighter" || eraserIsPixel) {
          c.isDrawingMode = true;
          c.selection = false;
          const brush = c.freeDrawingBrush;
          if (brush) {
            if (nextTool === "highlighter") {
              brush.color = "rgba(255, 235, 59, 0.45)";
              brush.width = Math.max(10, width * 2);
              brush.globalCompositeOperation = "multiply";
            } else if (eraserIsPixel) {
              brush.color = "rgba(0,0,0,1)";
              brush.width = Math.max(12, width * 2);
              brush.globalCompositeOperation = "destination-out";
            } else {
              brush.color = colorRef.current;
              brush.width = widthRef.current;
              brush.globalCompositeOperation = "source-over";
            }
          }
          c.defaultCursor = "crosshair";
          cursorRef.current = "crosshair";
        } else {
          c.isDrawingMode = false;
          c.selection = nextTool === "move" || nextTool === "cursor" || (nextTool === "eraser" && eraserModeRef.current === "object");
          if (nextTool === "pan") {
            c.defaultCursor = "grab";
          } else if (nextTool === "eraser" && eraserModeRef.current === "object") {
            c.defaultCursor = "not-allowed";
          } else {
            c.defaultCursor = nextTool === "move" || nextTool === "cursor" ? "default" : "crosshair";
          }
          cursorRef.current = c.defaultCursor;
        }
        c.requestRenderAll();
      };

      const addShape = (pointer: Point) => {
        if (!fabricRef.current || !canvasRef.current) return;
        const f = fabricRef.current;
        const c = canvasRef.current;
        if (toolRef.current === "rect") {
          suppressHistory.current = true;
          const rect = new f.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: "transparent",
            stroke: colorRef.current,
            strokeWidth: widthRef.current,
            selectable: false,
            evented: false,
          });
          shapeRef.current = rect;
          c.add(rect);
        }
        if (toolRef.current === "circle") {
          suppressHistory.current = true;
          const ellipse = new f.Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            fill: "transparent",
            stroke: colorRef.current,
            strokeWidth: widthRef.current,
            selectable: false,
            evented: false,
            originX: "center",
            originY: "center",
          });
          shapeRef.current = ellipse;
          c.add(ellipse);
        }
        if (toolRef.current === "line") {
          suppressHistory.current = true;
          const line = new f.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: colorRef.current,
            strokeWidth: widthRef.current,
            selectable: false,
            evented: false,
          });
          shapeRef.current = line;
          c.add(line);
        }
        if (toolRef.current === "arrow") {
          suppressHistory.current = true;
          const line = new f.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: colorRef.current,
            strokeWidth: widthRef.current,
            selectable: false,
            evented: false,
          });
          const tri = new f.Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 12,
            height: 12,
            fill: colorRef.current,
            selectable: false,
            evented: false,
            originX: "center",
            originY: "center",
          });
          shapeRef.current = line;
          arrowHeadRef.current = tri;
          c.add(line);
          c.add(tri);
        }
        if (toolRef.current === "triangle") {
          suppressHistory.current = true;
          const tri = new f.Triangle({
            left: pointer.x, top: pointer.y,
            width: 0, height: 0,
            fill: "transparent",
            stroke: colorRef.current, strokeWidth: widthRef.current,
            selectable: false, evented: false,
          });
          shapeRef.current = tri;
          c.add(tri);
        }
        if (toolRef.current === "star" || toolRef.current === "pentagon") {
          suppressHistory.current = true;
          const placeholder = new f.Rect({
            left: pointer.x, top: pointer.y,
            width: 0, height: 0,
            fill: "transparent",
            stroke: colorRef.current, strokeWidth: widthRef.current,
            strokeDashArray: [5, 4],
            selectable: false, evented: false, opacity: 0.5,
          });
          shapeRef.current = placeholder;
          c.add(placeholder);
        }
      };

      const updateShape = (pointer: Point) => {
        const obj = shapeRef.current;
        if (!obj || !startRef.current) return;
        const start = startRef.current;
        const c = canvasRef.current;
        if (!c) return;

        if (toolRef.current === "rect") {
          const w = pointer.x - start.x;
          const h = pointer.y - start.y;
          obj.set({
            left: w < 0 ? pointer.x : start.x,
            top: h < 0 ? pointer.y : start.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        }
        if (toolRef.current === "circle") {
          const w = pointer.x - start.x;
          const h = pointer.y - start.y;
          obj.set({
            rx: Math.abs(w) / 2,
            ry: Math.abs(h) / 2,
            left: start.x + w / 2,
            top: start.y + h / 2,
          });
        }
        if (toolRef.current === "arrow") {
          obj.set({ x2: pointer.x, y2: pointer.y });
          const tri = arrowHeadRef.current;
          if (tri) {
            const angle = (Math.atan2(pointer.y - start.y, pointer.x - start.x) * 180) / Math.PI;
            tri.set({ left: pointer.x, top: pointer.y, angle: angle + 90 });
          }
        }
        if (toolRef.current === "line") {
          obj.set({ x2: pointer.x, y2: pointer.y });
        }
        if (toolRef.current === "triangle") {
          const w = pointer.x - start.x;
          const h = pointer.y - start.y;
          obj.set({
            left: w < 0 ? pointer.x : start.x,
            top: h < 0 ? pointer.y : start.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        }
        if (toolRef.current === "star" || toolRef.current === "pentagon") {
          const w = pointer.x - start.x;
          const h = pointer.y - start.y;
          obj.set({
            left: w < 0 ? pointer.x : start.x,
            top: h < 0 ? pointer.y : start.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        }
        c.requestRenderAll();
      };

      const finalizeShape = () => {
        if (!canvasRef.current || !fabricRef.current) return;
        const c = canvasRef.current;
        const f = fabricRef.current;
        if ((toolRef.current === "star" || toolRef.current === "pentagon") && shapeRef.current) {
          const bbox = shapeRef.current.getBoundingRect();
          const cx = bbox.left + bbox.width / 2;
          const cy = bbox.top + bbox.height / 2;
          const r = Math.min(bbox.width, bbox.height) / 2;
          c.remove(shapeRef.current);
          const numPoints = 5;
          const isStar = toolRef.current === "star";
          const points: {x: number; y: number}[] = [];
          const total = isStar ? numPoints * 2 : numPoints;
          for (let i = 0; i < total; i++) {
            const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
            const radius = isStar ? (i % 2 === 0 ? r : r * 0.42) : r;
            points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
          }
          const poly = new f.Polygon(points, {
            fill: "transparent",
            stroke: colorRef.current, strokeWidth: widthRef.current,
            selectable: true, evented: true,
          });
          c.add(poly);
          c.setActiveObject(poly);
          shapeRef.current = null;
          arrowHeadRef.current = null;
          suppressHistory.current = false;
          c.requestRenderAll();
          saveHistory();
          return;
        }
        if (toolRef.current === "arrow" && shapeRef.current && arrowHeadRef.current) {
          const group = new f.Group([shapeRef.current, arrowHeadRef.current], {
            selectable: true,
            evented: true,
          });
          c.remove(shapeRef.current);
          c.remove(arrowHeadRef.current);
          c.add(group);
        } else if (shapeRef.current) {
          shapeRef.current.set({ selectable: true, evented: true });
        }
        shapeRef.current = null;
        arrowHeadRef.current = null;
        suppressHistory.current = false;
        c.requestRenderAll();
        saveHistory();
      };

      const addTextAt = (pointer: Point) => {
        const f = fabricRef.current;
        const c = canvasRef.current;
        if (!f || !c) return;
        const text = new f.IText("", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 22,
          fill: colorRef.current,
          fontFamily: "Inter, system-ui, sans-serif",
          selectable: true,
          evented: true,
        });
        c.add(text);
        c.setActiveObject(text);
        c.requestRenderAll();
        // Small delay lets Fabric finish rendering and the current mouse:down
        // handler unwind before we enter edit mode. Without this, fabric can
        // immediately exit editing as part of cleaning up the click event.
        setTimeout(() => {
          try {
            text.enterEditing();
            // Fabric appends a hidden <textarea> to the DOM that captures key
            // events while editing. Programmatic enterEditing does not always
            // focus it (focus may have stayed on the previously-clicked
            // toolbar button), which is why typing did nothing. Force focus
            // here so keystrokes route into the IText.
            const ta = (text as unknown as { hiddenTextarea?: HTMLTextAreaElement | null }).hiddenTextarea;
            if (ta && typeof ta.focus === "function") {
              ta.focus({ preventScroll: true });
              try {
                ta.selectionStart = 0;
                ta.selectionEnd = 0;
              } catch {/* some browsers throw on empty textarea selection */}
            }
            c.requestRenderAll();
          } catch (_) {/* fabric may throw if canvas was disposed */}
        }, 50);
        lastTextPos.current = { x: pointer.x, y: pointer.y + 28 };
      };

      const addNoteAt = (pointer: Point, value: string) => {
        const f = fabricRef.current;
        const c = canvasRef.current;
        if (!f || !c) return;
        const rect = new f.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 220,
          height: 120,
          fill: "#fef3c7",
          rx: 12,
          ry: 12,
          stroke: "#f59e0b",
          strokeWidth: 1,
        });
        const text = new f.Textbox(value, {
          left: pointer.x + 12,
          top: pointer.y + 10,
          width: 196,
          fontSize: 16,
          fill: "#0f172a",
          fontFamily: "Inter, system-ui, sans-serif",
        });
        const group = new f.Group([rect, text]);
        c.add(group);
        c.setActiveObject(group);
      };

      const addTableAt = (pointer: Point, rows: number, cols: number, data?: string[][]) => {
        const f = fabricRef.current;
        const c = canvasRef.current;
        if (!f || !c) return;
        const cellW = 80;
        const cellH = 36;
        const width = cols * cellW;
        const height = rows * cellH;
        const elements: any[] = [];
        for (let r = 0; r <= rows; r++) {
          elements.push(
            new f.Line([pointer.x, pointer.y + r * cellH, pointer.x + width, pointer.y + r * cellH], {
              stroke: color,
              strokeWidth: 1,
            }),
          );
        }
        for (let cidx = 0; cidx <= cols; cidx++) {
          elements.push(
            new f.Line([pointer.x + cidx * cellW, pointer.y, pointer.x + cidx * cellW, pointer.y + height], {
              stroke: color,
              strokeWidth: 1,
            }),
          );
        }
        if (data) {
          data.forEach((row, r) => {
            row.forEach((cell, cidx) => {
              if (!cell) return;
              elements.push(
                new f.Textbox(cell, {
                  left: pointer.x + cidx * cellW + 8,
                  top: pointer.y + r * cellH + 8,
                  width: cellW - 16,
                  fontSize: 14,
                  fill: "#0f172a",
                  fontFamily: "Inter, system-ui, sans-serif",
                }),
              );
            });
          });
        }
        const group = new f.Group(elements);
        c.add(group);
        c.setActiveObject(group);
      };

      const addOverlay = (pointer: Point, type: "laser" | "spotlight") => {
        const f = fabricRef.current;
        const c = canvasRef.current;
        if (!f || !c) return;
        const circle = new f.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: type === "laser" ? 8 : 90,
          fill: type === "laser" ? "rgba(239,68,68,0.75)" : "rgba(255,255,224,0.35)",
          selectable: false,
          evented: false,
          originX: "center",
          originY: "center",
        });
        c.add(circle);
        setTimeout(() => {
          c.remove(circle);
          c.requestRenderAll();
        }, type === "laser" ? 900 : 2000);
      };

      const handleMouseDown = (opt: any) => {
        const pointer = canvas.getPointer(opt.e);
        if (toolRef.current === "pan") {
          isPanning.current = true;
          lastPan.current = { x: opt.e.clientX, y: opt.e.clientY };
          canvas.defaultCursor = "grabbing";
          return;
        }
        if (toolRef.current === "eraser" && eraserModeRef.current === "object") {
          const selected = canvas.getActiveObjects();
          if (selected.length) {
            selected.forEach((obj: any) => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            saveHistory();
            return;
          }
          const target = canvas.findTarget(opt.e, false);
          if (target && !(target.lockMovementX && target.lockMovementY && target.lockRotation && target.lockScalingX && target.lockScalingY)) {
            canvas.remove(target);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            saveHistory();
          }
          return;
        }
        if (toolRef.current === "picker" || toolRef.current === "fill") {
          const target = canvas.findTarget(opt.e, false);
          if (target) {
            const applyColor = (obj: any, next: string) => {
              if (obj?._objects && Array.isArray(obj._objects)) {
                obj._objects.forEach((child: any) => applyColor(child, next));
                return;
              }
              const hasFill = typeof obj?.fill === "string" && obj.fill !== "";
              if (hasFill) obj.set({ fill: next });
              if (typeof obj?.stroke === "string") obj.set({ stroke: next });
            };
            if (toolRef.current === "picker") {
              const picked = (typeof target.fill === "string" && target.fill) || (typeof target.stroke === "string" && target.stroke);
              if (picked) {
                setColor(picked);
                colorRef.current = picked;
                onColorPick?.(picked);
              }
            } else {
              applyColor(target, colorRef.current);
              canvas.requestRenderAll();
              saveHistory();
            }
          }
          return;
        }
        if (toolRef.current === "rect" || toolRef.current === "circle" || toolRef.current === "arrow"
            || toolRef.current === "triangle" || toolRef.current === "star" || toolRef.current === "pentagon") {
          drawingShape.current = true;
          startRef.current = pointer;
          addShape(pointer);
          return;
        }
        if (toolRef.current === "line") {
          drawingShape.current = true;
          startRef.current = pointer;
          addShape(pointer);
          return;
        }
        if (toolRef.current === "text") {
          addTextAt(pointer);
          return;
        }
        if (toolRef.current === "note") {
          const cRect = (canvasRef.current as any)?.lowerCanvasEl?.getBoundingClientRect?.() ?? canvasElRef.current?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
          setNoteInput("");
          setNoteModal({ x: opt.e.clientX - (cRect?.left ?? 0), y: opt.e.clientY - (cRect?.top ?? 0), cx: pointer.x, cy: pointer.y });
          return;
        }
        if (toolRef.current === "table") {
          const rows = Number(window.prompt("Satır sayısı", "3") ?? 3);
          const cols = Number(window.prompt("Sütun sayısı", "3") ?? 3);
          if (rows > 0 && cols > 0) addTableAt(pointer, rows, cols);
          return;
        }
        if (toolRef.current === "math") {
          const el = canvasElRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          mathCanvasPosRef.current = pointer;
          setMathInput("");
          setMathModal({ x: opt.e.clientX - rect.left, y: opt.e.clientY - rect.top });
          return;
        }
        if (toolRef.current === "laser" || toolRef.current === "spotlight") {
          addOverlay(pointer, toolRef.current === "laser" ? "laser" : "spotlight");
        }
      };

      const handleMouseMove = (opt: any) => {
        const pointer = canvas.getPointer(opt.e);
        if (isPanning.current && lastPan.current && fabricRef.current) {
          const f = fabricRef.current;
          const dx = opt.e.clientX - lastPan.current.x;
          const dy = opt.e.clientY - lastPan.current.y;
          canvas.relativePan(new f.Point(dx, dy));
          lastPan.current = { x: opt.e.clientX, y: opt.e.clientY };
          updateSelectionUI();
          opt.e.preventDefault();
          opt.e.stopPropagation();
          return;
        }
        if (drawingShape.current) updateShape(pointer);
        if (!drawingShape.current && (toolRef.current === "laser" || toolRef.current === "spotlight")) {
          addOverlay(pointer, toolRef.current === "laser" ? "laser" : "spotlight");
        }
      };

      const handleMouseUp = () => {
        if (isPanning.current) {
          isPanning.current = false;
          lastPan.current = null;
          canvas.defaultCursor = "grab";
        }
        if (drawingShape.current) {
          drawingShape.current = false;
          finalizeShape();
        }
        // Güvenlik ağı: serbest çizim bittiğinde de geçmişe yaz
        if (canvas.isDrawingMode && !drawingShape.current) {
          saveHistory();
          canvas.requestRenderAll();
        }
        startRef.current = null;
      };

      canvas.on("mouse:down", handleMouseDown);
      canvas.on("mouse:move", handleMouseMove);
      canvas.on("mouse:up", handleMouseUp);
      canvas.on("mouse:wheel", (opt: any) => {
        if (toolRef.current !== "pan" || !fabricRef.current) return;
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.min(3, Math.max(0.4, zoom));
        const f = fabricRef.current;
        canvas.zoomToPoint(new f.Point(opt.e.offsetX, opt.e.offsetY), zoom);
        updateSelectionUI();
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      // ── Akıllı kalem / tablet / dokunmatik desteği ──────────────────────
      // Fabric'in upper canvas'ına native pointer event dinleyicileri ekle
      const upperEl: HTMLElement | null =
        (canvas as any).upperCanvasEl ?? (canvas as any).lowerCanvasEl ?? canvasElRef.current;
      if (upperEl) {
        // Basınç duyarlı çizim (stylus / Apple Pencil / Surface Pen)
        const onPointerMove = (e: PointerEvent) => {
          if (e.pointerType !== "pen") return;
          const c = canvasRef.current;
          if (!c?.isDrawingMode || !c.freeDrawingBrush) return;
          const pressure = e.pressure > 0 ? e.pressure : 0.5;
          const base = widthRef.current;
          // Pressure range: thin at 0.1 → thick at 1.0
          c.freeDrawingBrush.width = Math.max(0.5, base * pressure * 2.2);
        };
        // Tablet'te scroll yerine çizim için touch-action engelini uygula
        const onPointerDown = (e: PointerEvent) => {
          if (e.pointerType === "pen" || e.pointerType === "touch") {
            const c = canvasRef.current;
            if (c?.isDrawingMode) e.preventDefault();
          }
        };
        // Stylus geri çekilince (eraser ucu) silgi moduna geç
        const onPointerUp = (e: PointerEvent) => {
          if (e.pointerType === "pen") {
            const c = canvasRef.current;
            if (c?.isDrawingMode && c.freeDrawingBrush) {
              c.freeDrawingBrush.width = widthRef.current;
            }
          }
        };
        upperEl.addEventListener("pointermove", onPointerMove, { passive: true });
        upperEl.addEventListener("pointerdown", onPointerDown, { passive: false });
        upperEl.addEventListener("pointerup", onPointerUp, { passive: true });
        cleanupFns.push(
          () => upperEl.removeEventListener("pointermove", onPointerMove),
          () => upperEl.removeEventListener("pointerdown", onPointerDown),
          () => upperEl.removeEventListener("pointerup", onPointerUp),
        );
      }

      initHistory();
      setToolMode(toolRef.current);
      setReady(true);
      onReady?.();

      (canvas as any).__atlasioActions = {
        deleteSelection,
        duplicateSelection,
        bringToFront,
        sendToBack,
        lockSelection,
        unlockSelection,
        recolorSelection,
        copySelection,
        pasteSelection,
        applyTextProp,
      };

      cleanupFns.push(
        () => window.removeEventListener("resize", resizeCanvas),
        () => ro.disconnect(),
        () => window.removeEventListener("keydown", keyHandler),
        () => { try { canvas.dispose(); } catch (_) {} },
      );
      } catch (err) {
        console.error("Fabric load error", err);
        setLoadError("Tahta yüklenemedi. Tarayıcı konsolunu kontrol edin.");
      }
    })();
    return () => {
      mounted = false;
      cleanupFns.forEach(fn => fn());
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ready) return;
    toolRef.current = tool;
    eraserModeRef.current = eraserMode;
    colorRef.current = color;
    widthRef.current = width;
    const eraserIsPixel = tool === "eraser" && eraserMode === "pixel";
    if (tool === "pen" || tool === "highlighter" || eraserIsPixel) {
      c.isDrawingMode = true;
      c.selection = false;
      const brush = c.freeDrawingBrush;
      if (brush) {
        if (tool === "highlighter") {
          brush.color = "rgba(255, 235, 59, 0.45)";
          brush.width = Math.max(10, width * 2);
          brush.globalCompositeOperation = "multiply";
        } else if (eraserIsPixel) {
          brush.color = "#ffffff";
          brush.width = Math.max(12, width * 2);
          brush.globalCompositeOperation = "source-over";
        } else {
          brush.color = color;
          brush.width = width;
          brush.globalCompositeOperation = "source-over";
        }
      }
      c.defaultCursor = "crosshair";
      cursorRef.current = "crosshair";
    } else {
      c.isDrawingMode = false;
      c.selection = tool === "move" || tool === "cursor" || tool === "text" || tool === "note" || (tool === "eraser" && eraserMode === "object");
      if (tool === "pan") {
        c.defaultCursor = "grab";
      } else if (tool === "eraser" && eraserMode === "object") {
        c.defaultCursor = "not-allowed";
      } else {
        c.defaultCursor = tool === "move" || tool === "cursor" ? "default" : "crosshair";
      }
      cursorRef.current = c.defaultCursor;
    }
    c.requestRenderAll();
  }, [tool, color, width, eraserMode, ready]);

  const loadJSON = (c: any, json: string, onDone: () => void) => {
    // Works with both Fabric 5 (callback) and Fabric 6 (Promise)
    Promise.resolve(c.loadFromJSON(json, onDone)).then(onDone).catch(() => {});
  };

  const doUndo = () => {
    const c = canvasRef.current;
    const history = historyRef.current;
    if (!c || history.length <= 1) return;
    isRestoring.current = true;
    const current = history.pop();
    if (current) redoRef.current.push(current);
    const prev = history[history.length - 1];
    let done = false;
    loadJSON(c, prev, () => {
      if (done) return; done = true;
      c.requestRenderAll();
      isRestoring.current = false;
      setObjectCount(c.getObjects().length);
    });
  };

  const doRedo = () => {
    const c = canvasRef.current;
    const redoStack = redoRef.current;
    if (!c || redoStack.length === 0) return;
    isRestoring.current = true;
    const next = redoStack.pop();
    if (!next) { isRestoring.current = false; return; }
    historyRef.current.push(next);
    let done = false;
    loadJSON(c, next, () => {
      if (done) return; done = true;
      c.requestRenderAll();
      isRestoring.current = false;
      setObjectCount(c.getObjects().length);
    });
  };

  const doClear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getObjects().forEach((obj: any) => c.remove(obj));
    c.renderAll();
    setObjectCount(0);
    if (!isRestoring.current) {
      const json = JSON.stringify(c.toJSON());
      historyRef.current = [json];
      redoRef.current = [];
    }
  };

  const downloadPng = () => {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = "atlasio-whiteboard.png";
    link.href = c.toDataURL({ format: "png" });
    link.click();
  };

  const centerPoint = (): Point => {
    const c = canvasRef.current;
    if (!c) return { x: 200, y: 120 };
    return { x: c.getWidth() / 2, y: c.getHeight() / 2 };
  };

  const saveCurrentPage = () => {
    const c = canvasRef.current;
    if (!c) return;
    pagesRef.current[currentPageIdxRef.current] = JSON.stringify(c.toJSON());
  };

  const goToPage = (idx: number) => {
    const c = canvasRef.current;
    if (!c || idx < 0 || idx >= pagesRef.current.length) return;
    saveCurrentPage();
    currentPageIdxRef.current = idx;
    setCurrentPageIdx(idx);
    isRestoring.current = true;
    let done = false;
    loadJSON(c, pagesRef.current[idx], () => {
      if (done) return; done = true;
      c.requestRenderAll();
      isRestoring.current = false;
      setObjectCount(c.getObjects().length);
      historyRef.current = [pagesRef.current[idx]];
      redoRef.current = [];
    });
  };

  const addPage = () => {
    saveCurrentPage();
    const emptyJson = JSON.stringify({ version: "5.3.0", objects: [] });
    pagesRef.current.push(emptyJson);
    const newIdx = pagesRef.current.length - 1;
    setPageCount(pagesRef.current.length);
    goToPage(newIdx);
  };

  const deletePage = (idx: number) => {
    if (pagesRef.current.length <= 1) return;
    saveCurrentPage();
    pagesRef.current.splice(idx, 1);
    setPageCount(pagesRef.current.length);
    const nextIdx = Math.min(idx, pagesRef.current.length - 1);
    currentPageIdxRef.current = -1; // force reload
    setCurrentPageIdx(-1);
    setTimeout(() => goToPage(nextIdx), 0);
  };

  const submitNote = () => {
    if (!noteModal) return;
    const val = noteInput.trim() || "Not";
    if (fabricRef.current && canvasRef.current) {
      const f = fabricRef.current;
      const c = canvasRef.current;
      const rect = new f.Rect({ left: noteModal.cx, top: noteModal.cy, width: 220, height: 120, fill: "#fef3c7", rx: 12, ry: 12, stroke: "#f59e0b", strokeWidth: 1.5 });
      const text = new f.Textbox(val, { left: noteModal.cx + 12, top: noteModal.cy + 10, width: 196, fontSize: 16, fill: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" });
      const group = new f.Group([rect, text], { selectable: true, evented: true });
      c.add(group); c.setActiveObject(group); c.requestRenderAll();
    }
    setNoteModal(null); setNoteInput("");
  };

  const submitMath = () => {
    const expr = mathInput.trim();
    if (!expr || !canvasRef.current || !fabricRef.current) { setMathModal(null); return; }
    const f = fabricRef.current;
    const c = canvasRef.current;
    const pos = mathCanvasPosRef.current ?? centerPoint();
    const bg = new f.Rect({
      left: pos.x - 8, top: pos.y - 8,
      width: Math.max(120, expr.length * 11 + 16), height: 44,
      fill: "color-mix(in srgb,#3b82f6 8%,#ffffff)",
      rx: 8, ry: 8,
      stroke: "#93c5fd", strokeWidth: 1,
    });
    const text = new f.Textbox(expr, {
      left: pos.x, top: pos.y,
      fontSize: 18, fill: "#1e3a5f",
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: "italic",
      width: Math.max(100, expr.length * 11),
    });
    const group = new f.Group([bg, text], { selectable: true, evented: true });
    c.add(group);
    c.setActiveObject(group);
    c.requestRenderAll();
    setMathModal(null);
    setMathInput("");
  };

  const calcPress = (key: string) => {
    if (key === "C" || key === "AC") { setCalcExpr(""); setCalcResult(""); return; }
    if (key === "⌫") { setCalcExpr(v => v.slice(0, -1)); return; }
    if (key === "=") {
      try {
        let expr = calcExpr
          .replace(/π/g, "Math.PI")
          .replace(/\be\b/g, "Math.E")
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/asin\(/g, "Math.asin(")
          .replace(/acos\(/g, "Math.acos(")
          .replace(/atan\(/g, "Math.atan(")
          .replace(/log\(/g, "Math.log10(")
          .replace(/ln\(/g, "Math.log(")
          .replace(/√\(/g, "Math.sqrt(")
          .replace(/√/g, "Math.sqrt")
          .replace(/\^/g, "**")
          .replace(/×/g, "*");
        const safe = expr.replace(/[^0-9+\-*/().%\sMath.PIEsincotagqlr]/g, "");
        // eslint-disable-next-line no-new-func
        const res = Function('"use strict"; return (' + safe + ')')();
        const formatted = typeof res === "number" && !isNaN(res) ? String(parseFloat(res.toFixed(10))) : "Hata";
        setCalcResult(formatted);
        setCalcExpr(formatted);
      } catch { setCalcResult("Hata"); }
      return;
    }
    if (key === "tuvale") {
      const val = calcResult || calcExpr;
      if (!val || !canvasRef.current || !fabricRef.current) return;
      const f = fabricRef.current;
      const c = canvasRef.current;
      const pos = centerPoint();
      const text = new f.Textbox(`= ${val}`, {
        left: pos.x, top: pos.y,
        fontSize: 22, fill: colorRef.current,
        fontFamily: "Inter, system-ui, sans-serif", fontWeight: "bold",
      });
      c.add(text); c.setActiveObject(text); c.requestRenderAll();
      return;
    }
    setCalcExpr(v => v + key);
    setCalcResult("");
  };

  const addNote = (text: string) => {
    const pos = centerPoint();
    if (fabricRef.current && canvasRef.current) {
      const f = fabricRef.current;
      const c = canvasRef.current;
      const rect = new f.Rect({
        left: pos.x,
        top: pos.y,
        width: 220,
        height: 120,
        fill: "#fef3c7",
        rx: 12,
        ry: 12,
        stroke: "#f59e0b",
        strokeWidth: 1,
      });
      const textBox = new f.Textbox(text, {
        left: pos.x + 12,
        top: pos.y + 10,
        width: 196,
        fontSize: 16,
        fill: "#0f172a",
        fontFamily: "Inter, system-ui, sans-serif",
      });
      const group = new f.Group([rect, textBox]);
      c.add(group);
      c.setActiveObject(group);
    }
  };

  const addText = (text: string) => {
    const c = canvasRef.current;
    const f = fabricRef.current;
    if (!c || !f) return;
    const base = lastTextPos.current ?? centerPoint();
    const next = { x: base.x, y: base.y };
    const textBox = new f.Textbox(text, {
      left: next.x,
      top: next.y,
      fontSize: 22,
      fill: color,
      fontFamily: "Inter, system-ui, sans-serif",
      width: 320,
    });
    c.add(textBox);
    c.setActiveObject(textBox);
    lastTextPos.current = { x: next.x, y: next.y + 28 };
  };

  const addTable = (rows: number, cols: number, data?: string[][]) => {
    addTableAt(centerPoint(), rows, cols, data);
  };

  const addTableAt = (pos: Point, rows: number, cols: number, data?: string[][]) => {
    if (!canvasRef.current || !fabricRef.current) return;
    const f = fabricRef.current;
    const c = canvasRef.current;
    const cellW = 80;
    const cellH = 36;
    const width = cols * cellW;
    const height = rows * cellH;
    const elements: any[] = [];
    for (let r = 0; r <= rows; r++) {
      elements.push(
        new f.Line([pos.x, pos.y + r * cellH, pos.x + width, pos.y + r * cellH], {
          stroke: color,
          strokeWidth: 1,
        }),
      );
    }
    for (let cidx = 0; cidx <= cols; cidx++) {
      elements.push(
        new f.Line([pos.x + cidx * cellW, pos.y, pos.x + cidx * cellW, pos.y + height], {
          stroke: color,
          strokeWidth: 1,
        }),
      );
    }
    if (data) {
      data.forEach((row, r) => {
        row.forEach((cell, cidx) => {
          if (!cell) return;
          elements.push(
            new f.Textbox(cell, {
              left: pos.x + cidx * cellW + 8,
              top: pos.y + r * cellH + 8,
              width: cellW - 16,
              fontSize: 14,
              fill: "#0f172a",
              fontFamily: "Inter, system-ui, sans-serif",
            }),
          );
        });
      });
    }
    const group = new f.Group(elements);
    c.add(group);
    c.setActiveObject(group);
  };

  const addImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const f = fabricRef.current;
      const c = canvasRef.current;
      if (!f || !c) return;
      let imgHandled = false;
      const handleImg = (img: any) => {
        if (!img || imgHandled) return;
        imgHandled = true;
        const maxW = 480;
        const scale = img.width > maxW ? maxW / img.width : 1;
        img.set({ left: centerPoint().x, top: centerPoint().y, scaleX: scale, scaleY: scale });
        c.add(img);
        c.setActiveObject(img);
        c.requestRenderAll();
      };
      // Fabric 5: callback-based; Fabric 6: Promise-based
      const result = (f.Image.fromURL as any)(src, handleImg);
      if (result && typeof result.then === 'function') result.then(handleImg);
    };
    reader.readAsDataURL(file);
  };

  const bgStyle = backgroundStyle(background);
  const actionApi = (canvasRef.current as any)?.__atlasioActions;

  const canvasBg = background === "transparent"
    ? "transparent"
    : background && (background.startsWith('#') || background.startsWith('rgb'))
    ? background
    : '#ffffff';

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, borderRadius: canvasBg === "transparent" ? 0 : "var(--r-lg)", border: canvasBg === "transparent" ? "none" : "1.5px solid var(--line)", boxShadow: canvasBg === "transparent" ? "none" : "var(--shadow-sm)", overflow: "hidden", position: "relative", background: canvasBg, ...bgStyle }}>
        <canvas
          ref={canvasElRef}
          width={1280}
          height={720}
          style={{ display: "block", width: "100%", height: "100%", backgroundColor: canvasBg, touchAction: "none" }}
        />
        <div style={{
          position: "absolute", left: 8, bottom: 8, zIndex: 20,
          borderRadius: 99, padding: "2px 10px", fontSize: 11,
          background: "rgba(15,23,42,0.72)", color: "#fff",
          border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(6px)",
        }}>
          Objeler: {objectCount}
        </div>
        {!ready && !loadError ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, color: "#64748b", background: "rgba(255,255,255,0.7)" }}>{t.tr("Yükleniyor…")}</div>
        ) : null}
        {loadError ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, color: "#e11d48", background: "rgba(255,255,255,0.82)" }}>
            {loadError}
          </div>
        ) : null}
        {mathModal && (
          <div style={{
            position: "absolute",
            left: Math.min(mathModal.x, (canvasElRef.current?.clientWidth ?? 600) - 280),
            top: Math.max(8, mathModal.y - 60),
            zIndex: 30,
            background: "var(--panel)",
            border: "1.5px solid var(--accent)",
            borderRadius: "var(--r-lg)",
            padding: "10px 12px",
            boxShadow: "var(--shadow-md)",
            display: "flex", flexDirection: "column", gap: 8, minWidth: 240,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.07em" }}>
              FORMÜL / DENKLEMi GİRİN
            </div>
            <input
              autoFocus
              value={mathInput}
              onChange={e => setMathInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitMath(); if (e.key === "Escape") setMathModal(null); }}
              placeholder="örn: ∫x² dx = x³/3 + C"
              style={{
                border: "1.5px solid var(--line)", borderRadius: "var(--r-md)",
                padding: "7px 10px", fontSize: 15, fontFamily: "Georgia, serif", fontStyle: "italic",
                color: "var(--ink)", background: "var(--bg)", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["∫","∑","√","π","∞","≈","≠","≤","≥","α","β","θ","λ","Δ","²","³"].map(sym => (
                <button key={sym} onClick={() => setMathInput(v => v + sym)} style={{
                  padding: "3px 6px", fontSize: 13, borderRadius: 4,
                  border: "1px solid var(--line)", background: "var(--panel)",
                  cursor: "pointer", color: "var(--ink)", fontFamily: "Georgia, serif",
                }}>{sym}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setMathModal(null)} style={{
                padding: "5px 12px", fontSize: 12, borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)", background: "transparent",
                color: "var(--muted)", cursor: "pointer",
              }}>{t.tr("İptal")}</button>
              <button onClick={submitMath} style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 700, borderRadius: "var(--r-md)",
                border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer",
              }}>{t.tr("Tuvale Ekle")}</button>
            </div>
          </div>
        )}
        {noteModal && (
          <div style={{
            position: "absolute",
            left: Math.min(noteModal.x, (canvasElRef.current?.clientWidth ?? 600) - 260),
            top: Math.max(8, noteModal.y - 20),
            zIndex: 30,
            background: "#fef9c3",
            border: "1.5px solid #f59e0b",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", gap: 8, minWidth: 220,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", letterSpacing: "0.07em" }}>{t.tr("NOT EKLE")}</div>
            <textarea
              autoFocus
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote(); if (e.key === "Escape") setNoteModal(null); }}
              placeholder="Not içeriğini yazın…"
              rows={3}
              style={{ border: "1px solid #f59e0b", borderRadius: 7, padding: "6px 8px", fontSize: 13, fontFamily: "Inter, sans-serif", color: "#0f172a", background: "#fefce8", outline: "none", resize: "none" }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setNoteModal(null)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #d97706", background: "transparent", color: "#92400e", cursor: "pointer" }}>{t.tr("İptal")}</button>
              <button onClick={submitNote} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", background: "#f59e0b", color: "#fff", cursor: "pointer" }}>{t.tr("Tuvale Ekle")}</button>
            </div>
          </div>
        )}
        {calcOpen && (
          <div style={{
            position: "absolute", right: 12, top: 12, zIndex: 35,
            background: "var(--panel)", border: "1.5px solid var(--line)",
            borderRadius: "var(--r-xl)", padding: 14, boxShadow: "var(--shadow-md)",
            width: 260, display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.07em" }}>{t.tr("BİLİMSEL HESAP MAKİNESİ")}</span>
              <button onClick={() => setCalcOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", padding: "8px 12px", minHeight: 56 }}>
              <div style={{ fontSize: 10, color: "var(--muted)", minHeight: 14, textAlign: "right", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{calcExpr || " "}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums", textAlign: "right", fontFamily: "monospace" }}>{calcResult || "0"}</div>
            </div>
            {[
              ["sin(", "cos(", "tan(", "AC"],
              ["asin(", "acos(", "atan(", "⌫"],
              ["log(", "ln(", "√(", "%"],
              ["π", "e", "^", "/"],
              ["7", "8", "9", "×"],
              ["4", "5", "6", "-"],
              ["1", "2", "3", "+"],
              ["0", ".", "(", ")"],
            ].map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
                {row.map((k) => {
                  const isOp = ["/", "×", "-", "+", "^"].includes(k);
                  const isClear = k === "AC";
                  const isSci = ["sin(","cos(","tan(","asin(","acos(","atan(","log(","ln(","√(","π","e","⌫","%","(",")","."].includes(k);
                  return (
                    <button key={k} onClick={() => calcPress(k === "×" ? "×" : k)} style={{
                      padding: ri < 4 ? "6px 2px" : "9px 2px",
                      borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
                      background: isClear ? "color-mix(in srgb,#ef4444 15%,var(--panel))"
                        : isOp ? "color-mix(in srgb,var(--accent) 15%,var(--panel))"
                        : isSci ? "color-mix(in srgb,var(--accent) 8%,var(--panel))"
                        : "var(--panel)",
                      color: isClear ? "#ef4444" : isOp ? "var(--accent)" : isSci ? "color-mix(in srgb,var(--accent) 80%,var(--ink))" : "var(--ink)",
                      cursor: "pointer", fontSize: ri < 4 ? 10 : 13, fontWeight: 700, fontFamily: ri < 4 ? "monospace" : "inherit",
                    }}>{k}</button>
                  );
                })}
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 3 }}>
              <button onClick={() => calcPress("tuvale")} style={{
                padding: "8px", borderRadius: "var(--r-md)", border: "1.5px solid color-mix(in srgb,var(--accent) 30%,var(--line))",
                background: "color-mix(in srgb,var(--accent) 12%,var(--panel))",
                color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 700,
              }}>{t.tr("Tuvale Ekle")} ↗</button>
              <button onClick={() => calcPress("=")} style={{
                padding: "8px", borderRadius: "var(--r-md)", border: "none",
                background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900,
              }}>=</button>
            </div>
          </div>
        )}
        {textProps && (
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 12, zIndex: 32,
            background: "var(--panel)", border: "1.5px solid var(--line)",
            borderRadius: 12, padding: "6px 14px",
            boxShadow: "var(--shadow-md)",
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", maxWidth: "90%",
          }}>
            {/* Font family */}
            <select
              value={textProps.fontFamily}
              onChange={e => {
                const v = e.target.value;
                setTextProps(p => p ? { ...p, fontFamily: v } : null);
                actionApi?.applyTextProp?.("fontFamily", v);
              }}
              style={{ fontSize: 11, border: "1.5px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", padding: "2px 4px", cursor: "pointer" }}
            >
              {["Inter", "Georgia", "Arial", "Courier New", "Times New Roman", "Verdana", "Trebuchet MS"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {/* Font size */}
            <input
              type="number" min={8} max={144} value={textProps.fontSize}
              onChange={e => {
                const v = Number(e.target.value);
                setTextProps(p => p ? { ...p, fontSize: v } : null);
                actionApi?.applyTextProp?.("fontSize", v);
              }}
              style={{ width: 46, fontSize: 11, border: "1.5px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", padding: "2px 4px", textAlign: "center" }}
            />
            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--line)" }} />
            {/* Bold */}
            <button onClick={() => {
              const next = !textProps.bold;
              setTextProps(p => p ? { ...p, bold: next } : null);
              actionApi?.applyTextProp?.("fontWeight", next ? "bold" : "normal");
            }} title="Kalın (Ctrl+B)" style={{
              padding: "3px 8px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer",
              background: textProps.bold ? "var(--accent)" : "var(--panel)",
              color: textProps.bold ? "#fff" : "var(--ink)",
              fontWeight: 900, fontSize: 13, minWidth: 28,
            }}>B</button>
            {/* Italic */}
            <button onClick={() => {
              const next = !textProps.italic;
              setTextProps(p => p ? { ...p, italic: next } : null);
              actionApi?.applyTextProp?.("fontStyle", next ? "italic" : "normal");
            }} title="İtalik (Ctrl+I)" style={{
              padding: "3px 8px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer",
              background: textProps.italic ? "var(--accent)" : "var(--panel)",
              color: textProps.italic ? "#fff" : "var(--ink)",
              fontStyle: "italic", fontWeight: 700, fontSize: 13, minWidth: 28,
            }}>I</button>
            {/* Underline */}
            <button onClick={() => {
              const next = !textProps.underline;
              setTextProps(p => p ? { ...p, underline: next } : null);
              actionApi?.applyTextProp?.("underline", next);
            }} title="Altı Çizili (Ctrl+U)" style={{
              padding: "3px 8px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer",
              background: textProps.underline ? "var(--accent)" : "var(--panel)",
              color: textProps.underline ? "#fff" : "var(--ink)",
              textDecoration: "underline", fontWeight: 700, fontSize: 13, minWidth: 28,
            }}>U</button>
            {/* Strikethrough */}
            <button onClick={() => {
              const next = !textProps.linethrough;
              setTextProps(p => p ? { ...p, linethrough: next } : null);
              actionApi?.applyTextProp?.("linethrough", next);
            }} title="Üstü Çizili" style={{
              padding: "3px 8px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer",
              background: textProps.linethrough ? "var(--accent)" : "var(--panel)",
              color: textProps.linethrough ? "#fff" : "var(--ink)",
              textDecoration: "line-through", fontWeight: 700, fontSize: 13, minWidth: 28,
            }}>S</button>
            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--line)" }} />
            {/* Text alignment */}
            {(["left","center","right"] as const).map(align => (
              <button key={align} onClick={() => {
                setTextProps(p => p ? { ...p, textAlign: align } : null);
                actionApi?.applyTextProp?.("textAlign", align);
              }} title={align === "left" ? "Sola Hizala" : align === "center" ? "Ortala" : "Sağa Hizala"} style={{
                padding: "3px 7px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer",
                background: textProps.textAlign === align ? "var(--accent)" : "var(--panel)",
                color: textProps.textAlign === align ? "#fff" : "var(--ink)",
                fontSize: 12, minWidth: 26,
              }}>{align === "left" ? "≡" : align === "center" ? "≡" : "≡"}</button>
            ))}
            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--line)" }} />
            {/* Text color */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>A</span>
              <input
                type="color" value={textProps.color || "#000000"}
                onChange={e => {
                  const v = e.target.value;
                  setTextProps(p => p ? { ...p, color: v } : null);
                  actionApi?.applyTextProp?.("fill", v);
                }}
                style={{ width: 24, height: 24, borderRadius: 4, border: "1.5px solid var(--line)", cursor: "pointer", padding: 1, background: "none" }}
              />
            </div>
          </div>
        )}
        {selectionBox ? (
          <>
            <div style={{
              position: "absolute", pointerEvents: "none",
              border: "1.5px dashed #60a5fa", borderRadius: 4,
              left: selectionBox.left, top: selectionBox.top,
              width: selectionBox.width, height: selectionBox.height,
            }} />
            <div style={{
              position: "absolute",
              left: Math.min(Math.max(8, selectionBox.left), Math.max(8, selectionBox.viewportWidth - 240)),
              top: Math.max(8, selectionBox.top - 44),
              display: "flex", alignItems: "center", gap: 4,
              borderRadius: 99, border: "1.5px solid var(--line)",
              background: "var(--panel)", padding: "4px 8px",
              boxShadow: "var(--shadow-md)", fontSize: 11,
            }}>
              {[
                { label: "🗑️", fn: "deleteSelection" },
                { label: "⧉",  fn: "duplicateSelection" },
                { label: "⤒",  fn: "bringToFront" },
                { label: "⤓",  fn: "sendToBack" },
              ].map(({ label, fn }) => (
                <button key={fn} type="button" onClick={() => (actionApi as any)?.[fn]?.()} style={{
                  padding: "3px 7px", borderRadius: 99, border: "1px solid var(--line)",
                  background: "transparent", cursor: "pointer", fontSize: 12,
                  color: "var(--ink)", lineHeight: 1,
                }}>{label}</button>
              ))}
              <button type="button"
                onClick={() => (selectionLocked ? actionApi?.unlockSelection?.() : actionApi?.lockSelection?.())}
                style={{ padding: "3px 7px", borderRadius: 99, border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--ink)", lineHeight: 1 }}
              >{selectionLocked ? "🔓" : "🔒"}</button>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
                {palette.map((c) => (
                  <button key={c} type="button" onClick={() => actionApi?.recolorSelection?.(c)} style={{
                    width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--line)",
                    background: c, cursor: "pointer", padding: 0,
                  }} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showControls ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "6px 4px" }}>
          {([
            ["pen", "Kalem"], ["highlighter", "Fosfor"], ["eraser", "Silgi"],
            ["rect", "Şekil"], ["circle", "Daire"], ["arrow", "Ok"],
            ["text", "Yazı"], ["note", "Not"], ["table", "Tablo"], ["math", "∑ Formül"],
            ["triangle", "Üçgen"], ["star", "Yıldız"], ["pentagon", "Beşgen"],
          ] as [WhiteboardTool, string][]).map(([t, label]) => (
            <ToolButton key={t} label={label} active={tool === t} onClick={() => setTool(t)} />
          ))}
          <div style={{ width: 1, height: 24, background: "var(--line)", margin: "0 4px" }} />
          <button onClick={() => setCalcOpen(v => !v)} style={{
            padding: "4px 10px", fontSize: 11, borderRadius: "var(--r-md)", fontWeight: 600,
            border: calcOpen ? "1.5px solid var(--accent)" : "1.5px solid var(--line)",
            background: calcOpen ? "color-mix(in srgb,var(--accent) 10%,var(--panel))" : "var(--panel)",
            color: calcOpen ? "var(--accent)" : "var(--ink-2)", cursor: "pointer",
          }}>🧮 Hesap</button>
          <div style={{ width: 1, height: 24, background: "var(--line)", margin: "0 4px" }} />
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Renk")}</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            style={{ width: 36, height: 28, borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", cursor: "pointer", padding: 2 }} />
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Kalınlık")}</span>
          <input type="range" min={1} max={16} value={width} onChange={(e) => setWidth(Number(e.target.value))}
            style={{ width: 100, accentColor: "var(--accent)" }} />
        </div>
      ) : null}
      {/* Page strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
        background: "var(--panel)", borderRadius: "var(--r-lg)",
        border: "1.5px solid var(--line)", overflowX: "auto",
      }}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <div key={i} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => goToPage(i)}
              style={{
                width: 56, height: 36, borderRadius: 6,
                background: currentPageIdx === i
                  ? "color-mix(in srgb,var(--accent) 15%,var(--panel))"
                  : "color-mix(in srgb,var(--line) 60%,var(--panel))",
                border: currentPageIdx === i ? "2px solid var(--accent)" : "1.5px solid var(--line)",
                cursor: "pointer", fontSize: 11, fontWeight: 700,
                color: currentPageIdx === i ? "var(--accent)" : "var(--ink-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >{i + 1}</button>
            {pageCount > 1 && (
              <button
                onClick={() => deletePage(i)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#ef4444", border: "none",
                  cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
        ))}
        <button
          onClick={() => addPage()}
          style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0,
            background: "transparent", border: "1.5px dashed var(--line)",
            cursor: "pointer", fontSize: 18, color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
      </div>
    </div>
  );
});

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: "4px 10px", fontSize: 11, borderRadius: "var(--r-md)", fontWeight: 600,
        border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--line)",
        background: active ? "color-mix(in srgb,var(--accent) 10%,var(--panel))" : "var(--panel)",
        color: active ? "var(--accent)" : "var(--ink-2)", cursor: "pointer",
        transition: "all 0.13s",
      }}
    >
      {label}
    </button>
  );
}

function backgroundStyle(bg?: string) {
  if (!bg) return {} as React.CSSProperties;
  // Direct color value — handled via canvasBg, not background-image overlay
  if (bg.startsWith('#') || bg.startsWith('rgb')) return {} as React.CSSProperties;
  if (bg === "grid") {
    return {
      backgroundImage:
        "linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    } as React.CSSProperties;
  }
  if (bg === "dots") {
    return {
      backgroundImage: "radial-gradient(rgba(148,163,184,0.5) 1px, transparent 1px)",
      backgroundSize: "18px 18px",
    } as React.CSSProperties;
  }
  if (bg === "iso") {
    return {
      backgroundImage:
        "linear-gradient(30deg, rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(150deg, rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)",
      backgroundSize: "28px 16px",
    } as React.CSSProperties;
  }
  if (bg === "music") {
    return {
      backgroundImage: "linear-gradient(rgba(148,163,184,0.7) 1px, transparent 1px)",
      backgroundSize: "100% 24px",
    } as React.CSSProperties;
  }
  return {} as React.CSSProperties;
}
