interface TaskSelectorProps {
  tasks: string[];
  selectedTask: string;
  onTaskChange: (task: string) => void;
}

// Tasks that have complete validation rules implemented
const IMPLEMENTED_TASKS = [
  "消费者调研",
  "患者调研",
  "店员调研",
  "药店调研",
  "药店拜访",
  "等级医院拜访",
  "基层医疗机构拜访",
  "民营医院拜访",
  "竞品信息收集",
  "科室拜访",
  "培训会",
  "科室会",
  "圆桌会",
  "学术研讨、病例讨论会",
  "大型推广活动",
  "小型推广活动",
  "药店陈列服务"
];

const isTaskImplemented = (taskName: string): boolean => {
  return IMPLEMENTED_TASKS.includes(taskName);
};

export default function TaskSelector({ tasks, selectedTask, onTaskChange }: TaskSelectorProps) {
  const handleTaskChange = (value: string) => {
    if (isTaskImplemented(value) || value === "") {
      onTaskChange(value);
    }
  };

  return (
    <div>
      <label htmlFor="task-select" className="block text-sm font-medium text-gray-700 mb-2">
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
          const implemented = isTaskImplemented(task);
          return (
            <option
              key={task}
              value={task}
              disabled={!implemented}
              className={!implemented ? "text-gray-400" : ""}
            >
              {task}{!implemented ? " (开发中)" : ""}
            </option>
          );
        })}
      </select>
      {selectedTask && (
        <p className="mt-2 text-sm text-gray-700">
          已选择: <span className="font-medium">{selectedTask}</span>
          {!isTaskImplemented(selectedTask) && (
            <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              开发中
            </span>
          )}
        </p>
      )}
      {!selectedTask && (
        <div className="mt-2 text-xs text-gray-600">
          <p>✅ 已完成: {IMPLEMENTED_TASKS.length} 个任务类型</p>
          <p>🚧 开发中: {tasks.length - IMPLEMENTED_TASKS.length} 个任务类型</p>
        </div>
      )}
    </div>
  );
}
