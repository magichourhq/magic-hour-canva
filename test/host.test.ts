import { test } from "vitest";
import assert from "node:assert/strict";
import type { VideoResult } from "@magichourhq/editor-kit";
import { canvaHost } from "../src/host";
const result: VideoResult = {
  id: "existing-video",
  blob: new Blob(["video"], { type: "video/mp4" }),
  url: "https://media.example/video.mp4",
  expiresAt: "2030-01-01T00:00:00Z",
  credits: 24,
};
test("Canva waits for asset ingestion, discloses generated AI, and retries insertion using cached ref", async () => {
  let videoUploads = 0,
    previewUploads = 0,
    ingested = false,
    adds = 0;
  const add = async (input: any) => {
    assert.equal(ingested, true);
    assert.equal(input.ref, "native-video-ref");
    adds++;
  };
  const api: any = {
    features: { isSupported: () => true },
    asset: {
      getTemporaryUrl: async (input: any) => {
        assert.equal(input.ref, "preview-ref");
        return { url: "https://canva.example/preview.jpg" };
      },
      upload: async (input: any) => {
        assert.equal(input.aiDisclosure, "app_generated");
        if (input.type === "image") {
          previewUploads++;
          assert.match(input.url, /^data:image/);
          return { ref: "preview-ref", whenUploaded: async () => {} };
        }
        videoUploads++;
        assert.equal(input.url, result.url);
        assert.equal(input.thumbnailImageUrl, "https://canva.example/preview.jpg");
        return {
          ref: "native-video-ref",
          whenUploaded: async () => {
            ingested = true;
          },
        };
      },
    },
    design: {
      selection: { registerOnChange: () => () => {} },
      addElementAtPoint: add,
      addElementAtCursor: async () => assert.fail("wrong context"),
    },
  };
  const { host } = canvaHost(
    api,
    { load: async () => null, save: async () => {} },
    fetch,
    async () => "data:image/jpeg;base64,aGVsbG8="
  );
  await host.insertVideo(result);
  await host.insertVideo(result);
  assert.equal(videoUploads, 1);
  assert.equal(previewUploads, 1);
  assert.equal(adds, 2);
});
test("Canva uses cursor insertion in a context without point insertion", async () => {
  const point = async () => assert.fail("point insertion unsupported"),
    cursor = async () => {};
  let cursorCalled = false;
  const api: any = {
    features: { isSupported: (f: any) => f !== point },
    asset: {
      getTemporaryUrl: async () => ({ url: "https://canva.example/preview.jpg" }),
      upload: async () => ({ ref: "r", whenUploaded: async () => {} }),
    },
    design: {
      selection: { registerOnChange: () => () => {} },
      addElementAtPoint: point,
      addElementAtCursor: async () => {
        cursorCalled = true;
        await cursor();
      },
    },
  };
  await canvaHost(
    api,
    { load: async () => null, save: async () => {} },
    fetch,
    async () => "data:image/jpeg;base64,aA=="
  ).host.insertVideo(result);
  assert.equal(cursorCalled, true);
});
test("Canva downloads only the user-chosen original image, without API credentials", async () => {
  let change: any;
  const api: any = {
    features: { isSupported: () => true },
    asset: { getTemporaryUrl: async () => ({ url: "https://canva.example/original.png" }) },
    design: {
      selection: {
        registerOnChange: ({ onChange }: any) => {
          change = onChange;
          return () => {};
        },
      },
    },
  };
  const { host } = canvaHost(
    api,
    { load: async () => null, save: async () => {} },
    async (url, init) => {
      assert.equal(url, "https://canva.example/original.png");
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.headers, undefined);
      return new Response("image", { headers: { "Content-Type": "image/png" } });
    }
  );
  await assert.rejects(host.captureImage!(), /Select one image/);
  change({ count: 1, read: async () => ({ contents: [{ ref: "image-ref" }] }) });
  const source = await host.captureImage!();
  assert.equal(source.label, "Selected Canva image (full original)");
});
