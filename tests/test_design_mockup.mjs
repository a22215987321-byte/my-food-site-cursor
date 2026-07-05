import test from "node:test";
import assert from "node:assert/strict";
import { buildWireframeSvg, wireframeDataUrl } from "../lib/designMockupImage.js";

test("buildWireframeSvg returns valid svg for feed target", () => {
  const svg = buildWireframeSvg(
    { name: "動態消息", focus: "貼文卡片" },
    { label: "7月6日 12:00" }
  );
  assert.ok(svg.startsWith("<?xml"));
  assert.match(svg, /動態消息/);
  assert.match(svg, /EVONVCHAT/);
});

test("wireframeDataUrl returns embeddable svg data url", () => {
  const url = wireframeDataUrl({ name: "動態消息", focus: "貼文卡片" }, { label: "slot" });
  assert.match(url, /^data:image\/svg\+xml;base64,/);
});
