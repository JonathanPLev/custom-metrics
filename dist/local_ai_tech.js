// [local-ai-tech]

try {
  const patterns = {
    "WebLLM": [/webllm(\.min)?\.js/, /webllm\.(chat|load|init)/, /^https?:\/\/chat\.webllm\.ai(\/.*)?$/],
    "Transformers.js": [/transformers(\.min)?\.js/, /pipeline\(/, /huggingface\.co\/.+\/resolve\/(.+?)\//],
    "ONNX Runtime Web": [/ort(\.min)?\.js/, /\.onnx$/],
    "TensorFlow.js": [/tf(\.min)?\.js/, /model\.json/, /shard\d+of\d+/],
    "MediaPipe": [/mediapipe.*\.js/],
    "WebNN": [/navigator\.ml\./]
  };

  const results = {};

  function extractModelMetadata(url) {
    let modelName = null;
    let modelVersion = null;

    if (url.includes("huggingface.co")) {
      const match = url.match(/\/([^/]+)\/resolve\/([^/]+)\//);
      if (match) {
        modelName = match[1];
        modelVersion = match[2];
      }
    } else if (url.includes("model.json")) {
      modelName = "TensorFlow.js model";
    } else if (url.endsWith(".onnx")) {
      modelName = url.split("/").pop();
    }

    return { modelName, modelVersion };
  }

  function getSize(req) {
    return req.response_body_size || req.objectSize || req.encodedDataLength || null;
  }

  if (typeof $WPT_REQUESTS !== "undefined") {
    $WPT_REQUESTS.forEach((req) => {
      const url = req.url;

      for (const [tech, regexList] of Object.entries(patterns)) {
        for (const reg of regexList) {
          if (reg.test(url)) {
            if (!results[tech]) results[tech] = [];

            const { modelName, modelVersion } = extractModelMetadata(url);

            results[tech].push({
              type: "network",
              url,
              modelName,
              modelVersion,
              modelSizeBytes: getSize(req)
            });

            break;
          }
        }
      }
    });
  }

  if (typeof $WPT_BODIES !== "undefined") {
    $WPT_BODIES.forEach((entry) => {
      const body = entry.response_body || "";
      for (const [tech, regexList] of Object.entries(patterns)) {
        for (const reg of regexList) {
          if (reg.test(body)) {
            if (!results[tech]) results[tech] = [];
            results[tech].push({
              type: "inline",
              url: entry.url,
              indicator: reg.toString(),
              snippet: body.slice(0, 200)
            });
            break;
          }
        }
      }
    });
  }

  return results;

} catch (e) {
  return { error: e.message };
}
