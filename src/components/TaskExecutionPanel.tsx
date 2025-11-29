"use client";

interface ReviewTaskSimple {
  id: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  status: "pending" | "validating" | "completed" | "failed";
}

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

interface TaskExecutionPanelProps {
  tasks: ReviewTaskSimple[];
  results: ValidationResultSimple[];
  validatingTaskId: string | null;
  onViewResult: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    validating: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const labels = {
    pending: "待验证",
    validating: "验证中",
    completed: "已完成",
    failed: "失败",
  };

  return (
    <span
      className={`inline-block text-xs px-2 py-1 rounded mt-1 ${
        colors[status as keyof typeof colors]
      }`}
    >
      {labels[status as keyof typeof labels]}
    </span>
  );
}

export default function TaskExecutionPanel({
  tasks,
  results,
  validatingTaskId,
  onViewResult,
  onDeleteTask,
}: TaskExecutionPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">审核任务 ({tasks.length})</h3>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          暂无任务，请为文件创建审核任务
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isValidating = validatingTaskId === task.id;
            const hasResult = results.some((r) => r.taskId === task.id);

            return (
              <div
                key={task.id}
                className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={task.fileName}>
                      {task.fileName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {task.taskType} · {task.sheetName}
                    </p>
                    <StatusBadge status={task.status} />
                  </div>

                  <div className="flex space-x-2 ml-2">
                    {task.status === "pending" && (
                      <span className="text-sm text-gray-500 px-3 py-1 flex items-center">
                        <svg
                          className="animate-pulse h-4 w-4 mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        等待中...
                      </span>
                    )}

                    {isValidating && (
                      <span className="text-sm text-blue-600 px-3 py-1 flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        验证中...
                      </span>
                    )}

                    {hasResult && task.status === "completed" && (
                      <button
                        onClick={() => onViewResult(task.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        查看结果
                      </button>
                    )}

                    {task.status === "failed" && (
                      <span className="text-sm text-red-600 px-3 py-1">
                        验证失败
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`确定删除任务吗？`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                      title="删除任务"
                      disabled={isValidating}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
