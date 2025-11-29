"use client";

interface ValidationResultSimple {
  taskId: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  isValid: boolean;
  errorCount: number;
  totalRows: number;
  validRows: number;
  errors: any[];
  imageValidation?: any;
  summary: any;
}

interface ReviewTaskSimple {
  id: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  status: "pending" | "validating" | "completed" | "failed";
}

interface SummaryStatsProps {
  tasks: ReviewTaskSimple[];
  results: ValidationResultSimple[];
}

export default function SummaryStats({ tasks, results }: SummaryStatsProps) {
  // 使用任务列表来统计总数，避免重复结果导致计数错误
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const passedTasks = results.filter((r) => r.isValid).length;
  const failedTasks = completedTasks - passedTasks;

  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
  const totalValidRows = results.reduce((sum, r) => sum + r.validRows, 0);

  const totalImageIssues = results.reduce((sum, r) => {
    const imgVal = r.imageValidation;
    if (!imgVal) return sum;
    return sum + (imgVal.blurryImages || 0) + (imgVal.duplicateGroups || 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-600 font-medium">总任务数</p>
        <p className="text-2xl font-bold text-blue-900 mt-1">{totalTasks}</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-600 font-medium">通过任务</p>
        <p className="text-2xl font-bold text-green-900 mt-1">{passedTasks}</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600 font-medium">失败任务</p>
        <p className="text-2xl font-bold text-red-900 mt-1">{failedTasks}</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-600 font-medium">总错误数</p>
        <p className="text-2xl font-bold text-yellow-900 mt-1">{totalErrors}</p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-600 font-medium">总行数</p>
        <p className="text-2xl font-bold text-purple-900 mt-1">{totalRows}</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-600 font-medium">有效行数</p>
        <p className="text-2xl font-bold text-indigo-900 mt-1">
          {totalValidRows}
        </p>
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <p className="text-sm text-pink-600 font-medium">图片问题</p>
        <p className="text-2xl font-bold text-pink-900 mt-1">
          {totalImageIssues}
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">通过率</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {totalTasks > 0 ? ((passedTasks / totalTasks) * 100).toFixed(1) : 0}%
        </p>
      </div>
    </div>
  );
}
