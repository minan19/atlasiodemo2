"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
  | "cursor";

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
  },
  ref,
) {
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
    }),
    [color, width],
  );

  useEffect(() => {
    if (typeof toolProp !== "undefined" && toolProp !== tool) {
      setTool(toolProp);
    }
  }, [toolProp, tool]);

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
      // Debug erişimi: playwright / konsol için
      (canvasEl as any).__atlasCanvas = canvas;
      if (typeof window !== "undefined") {
        (window as any).__atlasCanvas = canvas;
      }
      canvasRef.current = canvas;
      // Ensure drawing brush exists (Fabric v6 doesn't always attach by default)
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      const resizeCanvas = () => {
        const host = canvasEl.parentElement;
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
      setTimeout(resizeCanvas, 0);
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
      };

      canvas.on("object:added", (e: any) => {
        if (e?.target) applyObjectStyle(e.target);
        saveHistory();
      });
      const finalizeFreeDraw = (path: any) => {
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
        finalizeFreeDraw(e.path);
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
        if (e.key === "Delete" || e.key === "Backspace") {
          deleteSelection();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) doRedo();
          else doUndo();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicateSelection();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          copySelection();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
          e.preventDefault();
          pasteSelection();
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
              brush.color = "#ffffff";
              brush.width = Math.max(12, width * 2);
              brush.globalCompositeOperation = "source-over";
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
        c.requestRenderAll();
      };

      const finalizeShape = () => {
        if (!canvasRef.current || !fabricRef.current) return;
        const c = canvasRef.current;
        const f = fabricRef.current;
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
          fill: color,
          fontFamily: "Inter, system-ui, sans-serif",
        });
        c.add(text);
        c.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
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
        if (toolRef.current === "rect" || toolRef.current === "circle" || toolRef.current === "arrow") {
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
          const val = window.prompt("Not içeriği:");
          if (val) addNoteAt(pointer, val);
          return;
        }
        if (toolRef.current === "table") {
          const rows = Number(window.prompt("Satır sayısı", "3") ?? 3);
          const cols = Number(window.prompt("Sütun sayısı", "3") ?? 3);
          if (rows > 0 && cols > 0) addTableAt(pointer, rows, cols);
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
      };

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", keyHandler);
        canvas.dispose();
      };
      } catch (err) {
        console.error("Fabric load error", err);
        setLoadError("Tahta yüklenemedi. Tarayıcı konsolunu kontrol edin.");
      }
    })();
    return () => {
      mounted = false;
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
      c.selection = tool === "move" || tool === "cursor" || (tool === "eraser" && eraserMode === "object");
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

  const doUndo = () => {
    const c = canvasRef.current;
    const history = historyRef.current;
    if (!c || history.length <= 1) return;
    isRestoring.current = true;
    const current = history.pop();
    if (current) redoRef.current.push(current);
    const prev = history[history.length - 1];
    c.loadFromJSON(prev, () => {
      c.renderAll();
      isRestoring.current = false;
    });
  };

  const doRedo = () => {
    const c = canvasRef.current;
    const redoStack = redoRef.current;
    if (!c || redoStack.length === 0) return;
    isRestoring.current = true;
    const next = redoStack.pop();
    if (next) historyRef.current.push(next);
    c.loadFromJSON(next, () => {
      c.renderAll();
      isRestoring.current = false;
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
      f.Image.fromURL(src, (img: any) => {
        const maxW = 480;
        const scale = img.width > maxW ? maxW / img.width : 1;
        img.set({ left: centerPoint().x, top: centerPoint().y, scaleX: scale, scaleY: scale });
        c.add(img);
        c.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
  };

  const bgStyle = backgroundStyle(background);
  const actionApi = (canvasRef.current as any)?.__atlasioActions;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden relative" style={bgStyle}>
        <canvas
          ref={canvasElRef}
          width={1280}
          height={720}
          className="block w-full h-full bg-white"
          style={{ touchAction: "none" }}
        />
        <div className="absolute left-2 bottom-2 z-20 rounded-full px-2 py-1 text-[11px] bg-slate-900/70 text-white border border-slate-800">
          Objeler: {objectCount}
        </div>
        {!ready && !loadError ? (
          <div className="absolute inset-0 grid place-items-center text-xs text-slate-500 bg-white/70">Yükleniyor…</div>
        ) : null}
        {loadError ? (
          <div className="absolute inset-0 grid place-items-center text-xs text-rose-600 bg-white/80">
            {loadError}
          </div>
        ) : null}
        {selectionBox ? (
          <>
            <div
              className="absolute border border-dashed border-sky-400 rounded-sm pointer-events-none"
              style={{
                left: selectionBox.left,
                top: selectionBox.top,
                width: selectionBox.width,
                height: selectionBox.height,
              }}
            />
            <div
              className="absolute flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 shadow-lg text-[11px]"
              style={{
                left: Math.min(Math.max(8, selectionBox.left), Math.max(8, selectionBox.viewportWidth - 220)),
                top: Math.max(8, selectionBox.top - 40),
              }}
            >
              <button
                className="px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-100"
                onClick={() => actionApi?.deleteSelection?.()}
                type="button"
              >
                🗑️
              </button>
              <button
                className="px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-100"
                onClick={() => actionApi?.duplicateSelection?.()}
                type="button"
              >
                ⧉
              </button>
              <button
                className="px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-100"
                onClick={() => actionApi?.bringToFront?.()}
                type="button"
              >
                ⤒
              </button>
              <button
                className="px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-100"
                onClick={() => actionApi?.sendToBack?.()}
                type="button"
              >
                ⤓
              </button>
              <button
                className="px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-100"
                onClick={() => (selectionLocked ? actionApi?.unlockSelection?.() : actionApi?.lockSelection?.())}
                type="button"
              >
                {selectionLocked ? "🔓" : "🔒"}
              </button>
              <div className="flex items-center gap-1 ml-1">
                {palette.map((c) => (
                  <button
                    key={c}
                    className="h-4 w-4 rounded-full border border-slate-200"
                    style={{ background: c }}
                    onClick={() => actionApi?.recolorSelection?.(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showControls ? (
        <div className="flex items-center gap-2 flex-wrap">
          <ToolButton label="✏️ Kalem" active={tool === "pen"} onClick={() => setTool("pen")} />
          <ToolButton label="🖍️ Fosfor" active={tool === "highlighter"} onClick={() => setTool("highlighter")} />
          <ToolButton label="🧽 Silgi" active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <ToolButton label="▭ Şekil" active={tool === "rect"} onClick={() => setTool("rect")} />
          <ToolButton label="◯ Daire" active={tool === "circle"} onClick={() => setTool("circle")} />
          <ToolButton label="➜ Ok" active={tool === "arrow"} onClick={() => setTool("arrow")} />
          <ToolButton label="T Yazı" active={tool === "text"} onClick={() => setTool("text")} />
          <ToolButton label="🗒️ Not" active={tool === "note"} onClick={() => setTool("note")} />
          <ToolButton label="⌗ Tablo" active={tool === "table"} onClick={() => setTool("table")} />
          <span className="text-xs text-slate-600 ml-2">Renk</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10" />
          <label className="text-xs text-slate-600 ml-2">Kalınlık</label>
          <input type="range" min={1} max={16} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-32" />
        </div>
      ) : null}
    </div>
  );
});

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-lg border ${
        active ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:bg-slate-50"
      }`}
      type="button"
    >
      {label}
    </button>
  );
}

function backgroundStyle(bg?: string) {
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
