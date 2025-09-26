import { useMemo } from "react";

interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
  imageValidation?: {
    totalImages: number;
    blurryImages: number;
    duplicateGroups: number;
    results: Array<{
      id: string;
      sharpness: number;
      isBlurry: boolean;
      duplicates: Array<{
        id: string;
        position?: string;
        row?: number;
        column?: string;
      }>;
      position?: string;
      row?: number;
      column?: string;
      mimeType?: string;
      width?: number;
      height?: number;
      megapixels?: number;
      dimensionOK?: boolean;
      dimensionIssue?: string;
      webLikelihood?: number;
      webReasons?: string[];
      isLowPixel?: boolean;
    }>;
    warning?: string;
  };
}

interface ValidationResponse {
  success: boolean;
  fileName: string;
  taskName: string;
  validation: ValidationResult;
}

type ImageValidation = NonNullable<ValidationResult["imageValidation"]>;
type ImageResult = ImageValidation["results"][number];

interface BaiduResultsProps {
  result: ValidationResponse;
}

function formatLocation(error: ValidationError) {
  const parts: string[] = [];
  if (error.row) parts.push(`第${error.row}行`);
  if (error.column) parts.push(`${error.column}列`);
  return parts.join(" · ") || "位置未知";
}

function buildImageTags(image: ImageResult) {
  const tags: string[] = [];
  if (image.isBlurry) tags.push("模糊");
  if (image.duplicates?.length) tags.push(`重复${image.duplicates.length + 1}张`);
  if (image.dimensionOK === false) tags.push("疑似非手机拍摄");
  if (image.isLowPixel) tags.push("低像素");
  if (typeof image.webLikelihood === "number" && image.webLikelihood >= 0.6) {
    tags.push("疑似网图");
  }
  return tags;
}

export default function BaiduResults({ result }: BaiduResultsProps) {
  const { validation, fileName, taskName } = result;

  const imagesWithIssues = useMemo(() => {
    const list = validation.imageValidation?.results ?? [];
    return list.filter((img) => {
      return (
        img.isBlurry ||
        (img.duplicates?.length ?? 0) > 0 ||
        img.dimensionOK === false ||
        img.isLowPixel ||
        (typeof img.webLikelihood === "number" && img.webLikelihood >= 0.6)
      );
    });
  }, [validation.imageValidation]);

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="text-sm text-gray-500 mb-2">百度为您找到相关结果约 {validation.summary.totalRows} 条</div>
        <h1 className="text-2xl font-semibold text-[#222]">
          {fileName || "未命名文件"} - {taskName}
        </h1>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full">总行数 {validation.summary.totalRows}</span>
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full">有效行 {validation.summary.validRows}</span>
          <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full">问题 {validation.summary.errorCount}</span>
          {validation.imageValidation && (
            <>
              <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full">图片 {validation.imageValidation.totalImages}</span>
              <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-full">模糊 {validation.imageValidation.blurryImages}</span>
              <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full">重复组 {validation.imageValidation.duplicateGroups}</span>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 px-6 py-6">
        <main className="space-y-6">
          <section>
            <h2 className="text-lg font-medium text-[#222] mb-4">结构验证结果</h2>
            {validation.errors.length === 0 ? (
              <div className="text-sm text-gray-500">未发现结构错误，恭喜！</div>
            ) : (
              <div className="space-y-4">
                {validation.errors.map((error, index) => (
                  <article key={`${error.row}-${error.column}-${index}`} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="text-base font-semibold text-blue-600">
                      {error.field || "未命名字段"} - {error.message}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      错误类型：{error.errorType} · 位置：{formatLocation(error)}
                    </p>
                    {error.value !== undefined && (
                      <p className="text-sm text-gray-500 mt-2">当前值：{String(error.value)}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#222] mb-4">图片风险提示</h2>
            {validation.imageValidation ? (
              imagesWithIssues.length > 0 ? (
                <div className="space-y-4">
                  {imagesWithIssues.map((image) => {
                    const tags = buildImageTags(image);
                    return (
                      <article key={image.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-blue-600">图片 {image.id}</h3>
                          <div className="text-xs text-gray-400">清晰度 {image.sharpness.toFixed(1)}</div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          位置：{image.position || `${image.column ?? "?"}${image.row ?? "?"}`}
                        </p>
                        {image.webReasons?.length ? (
                          <p className="text-xs text-purple-600 mt-2">{image.webReasons.join("；")}</p>
                        ) : null}
                        {image.dimensionIssue && (
                          <p className="text-xs text-amber-600 mt-2">{image.dimensionIssue}</p>
                        )}
                        {image.duplicates?.length ? (
                          <p className="text-xs text-gray-500 mt-2">
                            其他位置：
                            {image.duplicates
                              .map((dup) => dup.position || `${dup.column ?? ""}${dup.row ?? ""}`)
                              .filter(Boolean)
                              .join("，")}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">所有图片检测通过。</div>
              )
            ) : (
              <div className="text-sm text-gray-500">未执行图片验证。</div>
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <div className="bg-[#f5f7ff] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#222]">相关建议</h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-600">
              <li>查看模板要求确保字段匹配</li>
              <li>模糊照片请重新拍摄</li>
              <li>重复图片建议保留一张</li>
              <li>疑似网图请替换为真实照片</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#222]">图片统计</h3>
            {validation.imageValidation ? (
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>总图片：{validation.imageValidation.totalImages}</li>
                <li>模糊：{validation.imageValidation.blurryImages}</li>
                <li>重复组：{validation.imageValidation.duplicateGroups}</li>
                <li>问题图片：{imagesWithIssues.length}</li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">暂无图片数据</p>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#222]">相关搜索</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {[
                "Excel 图片模糊怎么处理",
                "Excel 数据验证模板",
                "网图识别方法",
                "批量替换 Excel 图片",
              ].map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-1 bg-[#f5f5f5] rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
