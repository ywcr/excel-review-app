interface TaskSelectorProps {
  tasks: string[];
  selectedTask: string;
  onTaskChange: (task: string) => void;
  compact?: boolean;
}

// 核心已完成的任务类型（确保这些一定可用）
const CORE_IMPLEMENTED_TASKS = [
  "消费者调研",
  "患者调研",
  "店员调研",
  "药店调研",
  "药店拜访",
  "医院拜访", // 统一模板，包含等级医院、基层医疗机构、民营医院
  "竞品信息收集",
  "科室拜访",
  "培训会",
  "科室会",
  "圆桌会",
  "学术研讨、病例讨论会",
  "大型推广活动",
  "小型推广活动",
  "药店陈列服务",
];

// 检查任务是否已实现（现在更宽松，允许所有任务）
const isTaskImplemented = (taskName: string): boolean => {
  // 如果是核心任务，肯定已实现
  if (CORE_IMPLEMENTED_TASKS.includes(taskName)) {
    return true;
  }

  // 对于其他任务，也允许使用（可能有基础验证规则）
  return true;
};

export default function TaskSelector({
  tasks,
  selectedTask,
  onTaskChange,
  compact = false,
}: TaskSelectorProps) {
  const handleTaskChange = (value: string) => {
    // 现在允许所有任务
    onTaskChange(value);
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-700">
        <span>任务:</span>
        <select
          value={selectedTask}
          onChange={(e) => handleTaskChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {tasks.map((task) => (
            <option key={task} value={task}>
              {task}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="task-select"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        选择任务类型
      </label>
      <select
        id="task-select"
        value={selectedTask}
        onChange={(e) => handleTaskChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
      >
        <option value="">请选择任务类型</option>
        {tasks.map((task) => {
          const isCoreTask = CORE_IMPLEMENTED_TASKS.includes(task);
          return (
            <option
              key={task}
              value={task}
              className={!isCoreTask ? "text-blue-600" : ""}
            >
              {task}
              {!isCoreTask ? " (基础支持)" : ""}
            </option>
          );
        })}
      </select>
      {selectedTask && (
        <p className="mt-2 text-sm text-gray-700">
          已选择: <span className="font-medium">{selectedTask}</span>
          {!CORE_IMPLEMENTED_TASKS.includes(selectedTask) && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              基础支持
            </span>
          )}
        </p>
      )}
      {!selectedTask && (
        <div className="mt-2 text-xs text-gray-600">
          <p>✅ 核心任务: {CORE_IMPLEMENTED_TASKS.length} 个（完整验证规则）</p>
          <p>
            🔧 基础支持:{" "}
            {Math.max(0, tasks.length - CORE_IMPLEMENTED_TASKS.length)}{" "}
            个（基础验证）
          </p>
          <p>📊 总计: {tasks.length} 个任务类型</p>
        </div>
      )}
    </div>
  );
}
