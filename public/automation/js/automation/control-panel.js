// ==================== 控制面板管理器 ====================

/**
 * 控制面板管理器类
 * 负责生成自动化控制面板代码
 */
class ControlPanelManager {
    constructor() {}

    /**
     * 获取控制面板代码
     */
    getControlPanelCode(options = {}) {
        const {
            isAllDates = false,
            hasChannel = false,
            mode = 'dom'
        } = options;

        const flag = isAllDates ? "true" : "false";
        const hasChannelFlag = hasChannel ? "true" : "false";

        return `
// ==================== 自动化控制面板 ====================
(function(){
  try {
    if (document.getElementById('automation-control-panel')) return;

    // 样式
    var style = document.createElement('style');
    style.id = 'automation-control-panel-style';
    style.textContent = "${this.getControlPanelStyles()}";
    document.head.appendChild(style);

    // 控制面板
    var panel = document.createElement('div');
    panel.id = 'automation-control-panel';

    var header = document.createElement('div');
    header.className = 'acp-header';
    var title = document.createElement('div');
    title.className = 'acp-title';
    var modeText = (typeof window.startApi==='function' || typeof window.automaticApi==='function') ? 'API' : 'DOM';
    title.innerHTML = '<span>🧰 自动化控制台</span><span class="muted">(' + modeText + '模式)</span>';
    var actions = document.createElement('div'); actions.className='acp-actions';
    var minBtn=document.createElement('button'); minBtn.className='acp-btn'; minBtn.title='最小化'; minBtn.textContent='—';
    var closeBtn=document.createElement('button'); closeBtn.className='acp-btn'; closeBtn.title='关闭'; closeBtn.textContent='×';
    actions.appendChild(minBtn); actions.appendChild(closeBtn);
    header.appendChild(title); header.appendChild(actions);

    var body = document.createElement('div'); body.className='acp-body';
    
    // 进度显示区域（仅API模式）
    var isApiMode = (typeof window.startApi==='function' || typeof window.automaticApi==='function');
    if (isApiMode) {
      var progressBar = document.createElement('div'); progressBar.className='acp-progress-bar';
      progressBar.style.display='none';
      progressBar.innerHTML = '<div class="acp-progress-fill" style="width:0%"></div><div class="acp-progress-text">0/0</div>';
      body.appendChild(progressBar);
      
      var statsRow = document.createElement('div'); statsRow.className='acp-stats';
      statsRow.style.display='none';
      statsRow.innerHTML = '<span class="stat-success">✓ 0</span><span class="stat-failed">✗ 0</span><span class="stat-time">00:00</span>';
      body.appendChild(statsRow);
    }

    // 创建联系人按钮总是存在
    var btnAddContact = document.createElement('button'); btnAddContact.className='info'; btnAddContact.textContent='创建联系人'; btnAddContact.title='startAddContact()';
    var btnAddContactFast = document.createElement('button'); btnAddContactFast.className='success'; btnAddContactFast.textContent='快速创建🚀'; btnAddContactFast.title='startAddContactFast()';
    ${
      hasChannelFlag === "true"
        ? `
    // 添加创建医院按钮
    var btnAddChannel = document.createElement('button'); btnAddChannel.className='info'; btnAddChannel.textContent='创建医院'; btnAddChannel.title='startAddChannel()';
    body.appendChild(btnAddChannel);`
        : ""
    }
    body.appendChild(btnAddContact);
    body.appendChild(btnAddContactFast);
    
    // 分隔线
    var separator1 = document.createElement('div'); separator1.className='acp-separator';
    body.appendChild(separator1);

    // 控制按钮
    var btnStart = document.createElement('button'); btnStart.className='light'; btnStart.textContent='单步执行'; btnStart.title='start()';
    var btnAuto = document.createElement('button'); btnAuto.className='primary'; btnAuto.textContent='自动执行'; btnAuto.title='automatic()';
    var btnAutoFast = document.createElement('button'); btnAutoFast.className='success'; btnAutoFast.textContent='快速执行⚡'; btnAutoFast.title='automaticApiFast() or automaticFast()';
    var btnValidate = document.createElement('button'); btnValidate.className='secondary'; btnValidate.textContent='验证遗漏'; btnValidate.title='validateData()';
    var btnShowMissing = document.createElement('button'); btnShowMissing.className='light'; btnShowMissing.textContent='显示遗漏'; btnShowMissing.title='showMissing()';
    var btnUpdateMissing = document.createElement('button'); btnUpdateMissing.className='warn'; btnUpdateMissing.textContent='补充遗漏'; btnUpdateMissing.title='updateWithMissing()';
    var btnExecuteAll = document.createElement('button'); btnExecuteAll.className='secondary'; btnExecuteAll.textContent='全部日期'; btnExecuteAll.title='executeAllDates()';
    var btnErrorSummary = document.createElement('button'); btnErrorSummary.className='error'; btnErrorSummary.textContent='错误汇总'; btnErrorSummary.title='showErrorSummary()';

    body.appendChild(btnStart);
    body.appendChild(btnAuto);
    body.appendChild(btnAutoFast);
    body.appendChild(btnValidate);
    body.appendChild(btnUpdateMissing);
    body.appendChild(btnExecuteAll);
    btnShowMissing.style.display='none'; // 隐藏显示遗漏
    btnErrorSummary.style.display='none'; // 初始隐藏
    
    // 执行控制按钮（仅API模式）
    if (isApiMode) {
      var separator2 = document.createElement('div'); separator2.className='acp-separator';
      separator2.style.display='none';
      separator2.id='acp-control-separator';
      body.appendChild(separator2);
      
      var btnPause = document.createElement('button'); btnPause.className='warn'; btnPause.textContent='⏸️ 暂停'; btnPause.id='btn-pause';
      var btnResume = document.createElement('button'); btnResume.className='success'; btnResume.textContent='▶️ 继续'; btnResume.id='btn-resume';
      var btnStop = document.createElement('button'); btnStop.className='error'; btnStop.textContent='⏹️ 停止'; btnStop.id='btn-stop';
      btnPause.style.display='none';
      btnResume.style.display='none';
      btnStop.style.display='none';
      body.appendChild(btnPause);
      body.appendChild(btnResume);
      body.appendChild(btnStop);
    }

    // 日期输入行
    var row = document.createElement('div'); row.className='acp-row';
    var dateInput = document.createElement('input'); dateInput.type='text'; dateInput.placeholder='输入日期 (如 09.01)';
    var runByDateBtn = document.createElement('button'); runByDateBtn.className='secondary'; runByDateBtn.textContent='按日期执行';
    row.appendChild(dateInput); row.appendChild(runByDateBtn);
    body.appendChild(row);

    // 高级选项（API模式）
    if (isApiMode) {
      var separator3 = document.createElement('div'); separator3.className='acp-separator';
      body.appendChild(separator3);
      
      var advToggle = document.createElement('div'); advToggle.className='acp-adv-toggle'; advToggle.textContent='▼ 高级选项';
      body.appendChild(advToggle);
      
      var advPanel = document.createElement('div'); advPanel.className='acp-adv-panel'; advPanel.style.display='none';
      
      // 间隔设置
      var intervalRow = document.createElement('div'); intervalRow.className='acp-row';
      var intervalLabel = document.createElement('span'); intervalLabel.textContent='间隔:'; intervalLabel.style.fontSize='12px';
      var intervalInput = document.createElement('input'); intervalInput.type='number'; intervalInput.value='5000'; intervalInput.placeholder='毫秒'; intervalInput.style.width='80px';
      var intervalBtn = document.createElement('button'); intervalBtn.className='light'; intervalBtn.textContent='设置';
      intervalRow.appendChild(intervalLabel); intervalRow.appendChild(intervalInput); intervalRow.appendChild(intervalBtn);
      advPanel.appendChild(intervalRow);
      
      // 起始位置设置
      var positionRow = document.createElement('div'); positionRow.className='acp-row';
      var positionLabel = document.createElement('span'); positionLabel.textContent='起始:'; positionLabel.style.fontSize='12px';
      var positionInput = document.createElement('input'); positionInput.type='text'; positionInput.placeholder='数字或姓名'; positionInput.style.width='80px';
      var positionBtn = document.createElement('button'); positionBtn.className='light'; positionBtn.textContent='跳转';
      var resetBtn = document.createElement('button'); resetBtn.className='warn'; resetBtn.textContent='重置'; resetBtn.style.padding='4px 8px';
      positionRow.appendChild(positionLabel); positionRow.appendChild(positionInput); positionRow.appendChild(positionBtn); positionRow.appendChild(resetBtn);
      advPanel.appendChild(positionRow);
      
      body.appendChild(advPanel);
      
      // 高级选项折叠切换
      advToggle.addEventListener('click', function(){
        if(advPanel.style.display==='none'){ advPanel.style.display='block'; advToggle.textContent='▲ 高级选项'; }
        else{ advPanel.style.display='none'; advToggle.textContent='▼ 高级选项'; }
      });
    }

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // 拖拽功能
    ${this.getDragFunctionality()}

    // 最小化 / 关闭
    var minimized=false;
    minBtn.addEventListener('click', function(){ minimized=!minimized; body.style.display=minimized?'none':'grid'; });
    closeBtn.addEventListener('click', function(){ panel.remove(); });

    // 安全调用函数
    var fns = {
      start: (window.startApi || window.start),
      automatic: (window.automaticApi || window.automatic),
      automaticFast: (window.automaticApiFast || window.automaticFast),
      validateData: window.validateData,
      showMissing: window.showMissing,
      updateWithMissing: window.updateWithMissing,
      executeAllDates: window.executeAllDates,
      showErrorSummary: window.showErrorSummary,${
        hasChannelFlag === "true"
          ? `
      startAddChannel: window.startAddChannel,`
          : ""
      }
      startAddContact: window.startAddContact,
      startAddContactFast: window.startAddContactFast,
      setApiInterval: window.setApiInterval,
      resetProgress: window.resetProgress,
      setStartPosition: window.setStartPosition,
      pauseExecution: window.pauseExecution,
      resumeExecution: window.resumeExecution,
      stopExecution: window.stopExecution
    };
    function call(name, arg){
      var fn = fns[name];
      if (typeof fn !== 'function'){ console.warn('函数不可用:', name); return; }
      try { (arg===undefined) ? fn() : fn(arg); } catch(err){ console.error('执行失败', name, err); }
    }

    // 事件绑定${
      hasChannelFlag === "true"
        ? `
    // 医院创建按钮事件
    var channelBtn = body.querySelector('button[title="startAddChannel()"]');
    if (channelBtn) {
      channelBtn.addEventListener('click', function(){ call('startAddChannel'); });
    }`
        : ""
    }
    if (btnAddContact) {
      btnAddContact.addEventListener('click', function(){ call('startAddContact'); });
    }
    if (btnAddContactFast) {
      btnAddContactFast.addEventListener('click', function(){ 
        var batch = prompt('请输入批次大小（并发数量）:', '10');
        if (batch) call('startAddContactFast', parseInt(batch));
      });
    }
    btnStart.addEventListener('click', function(){ call('start'); });
    btnAuto.addEventListener('click', function(){ call('automatic'); });
    if (btnAutoFast) {
      btnAutoFast.addEventListener('click', function(){ 
        var batch = prompt('请输入批次大小（并发数量）:', '10');
        if (batch) call('automaticFast', parseInt(batch));
      });
    }
    runByDateBtn.addEventListener('click', function(){ var v=(dateInput.value||'').trim(); if(!v){ call('automatic'); } else { call('automatic', v); } });
    btnValidate.addEventListener('click', function(){ call('validateData'); });
    btnShowMissing.addEventListener('click', function(){ call('showMissing'); });
    btnUpdateMissing.addEventListener('click', function(){ call('updateWithMissing'); });
    
    // 高级选项事件（API模式）
    if (isApiMode) {
      intervalBtn.addEventListener('click', function(){
        var val = parseInt(intervalInput.value);
        if (val && val > 0) call('setApiInterval', val);
      });
      positionBtn.addEventListener('click', function(){
        var pos = positionInput.value.trim();
        if (!pos) return;
        var num = parseInt(pos);
        call('setStartPosition', isNaN(num) ? pos : num);
      });
      resetBtn.addEventListener('click', function(){ call('resetProgress'); });
      
      // 控制按钮事件
      if (btnPause) btnPause.addEventListener('click', function(){ call('pauseExecution'); });
      if (btnResume) btnResume.addEventListener('click', function(){ call('resumeExecution'); });
      if (btnStop) btnStop.addEventListener('click', function(){ call('stopExecution'); });
      
      // 监听执行统计更新
      window.addEventListener('executionStatsUpdate', function(e){
        var stats = e.detail;
        if (!stats) return;
        
        // 显示/隐藏进度条和控制按钮
        if (stats.isRunning) {
          progressBar.style.display='block';
          statsRow.style.display='flex';
          separator2.style.display='block';
          btnPause.style.display = stats.isPaused ? 'none' : 'inline-block';
          btnResume.style.display = stats.isPaused ? 'inline-block' : 'none';
          btnStop.style.display='inline-block';
        } else {
          progressBar.style.display='none';
          statsRow.style.display='none';
          separator2.style.display='none';
          btnPause.style.display='none';
          btnResume.style.display='none';
          btnStop.style.display='none';
        }
        
        // 更新进度条
        if (stats.total > 0) {
          var percent = Math.round((stats.current / stats.total) * 100);
          var fill = progressBar.querySelector('.acp-progress-fill');
          var text = progressBar.querySelector('.acp-progress-text');
          if (fill) fill.style.width = percent + '%';
          if (text) text.textContent = stats.current + '/' + stats.total + ' (' + percent + '%)';
        }
        
        // 更新统计
        var successSpan = statsRow.querySelector('.stat-success');
        var failedSpan = statsRow.querySelector('.stat-failed');
        var timeSpan = statsRow.querySelector('.stat-time');
        if (successSpan) successSpan.textContent = '✓ ' + stats.success;
        if (failedSpan) failedSpan.textContent = '✗ ' + stats.failed;
        if (timeSpan && stats.startTime) {
          var elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
          var minutes = Math.floor(elapsed / 60);
          var seconds = elapsed % 60;
          timeSpan.textContent = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        }
      });
    }

    // 可选按钮
    if (typeof fns.executeAllDates === 'function' && ${flag}) {
      btnExecuteAll.style.display='inline-block';
      btnExecuteAll.addEventListener('click', function(){ call('executeAllDates'); });
    } else {
      btnExecuteAll.style.display='none';
    }
    if (typeof fns.showErrorSummary === 'function') {
      btnErrorSummary.style.display='inline-block';
      btnErrorSummary.addEventListener('click', function(){ call('showErrorSummary'); });
    } else {
      btnErrorSummary.style.display='none';
    }
  } catch(e){ console.warn('初始化控制面板失败:', e); }
})();
`;
    }

    /**
     * 获取控制面板样式
     */
    getControlPanelStyles() {
        return (
          "#automation-control-panel{position:fixed;right:20px;bottom:20px;width:320px;background:#fff;border:1px solid #e1e4e8;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.12);font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue','Noto Sans','Liberation Sans',Arial,'Apple Color Emoji','Segoe UI Emoji';z-index:2147483647;overflow:hidden;}" +
          "#automation-control-panel .acp-header{cursor:move;background:linear-gradient(135deg,#20c997,#17a2b8);color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-weight:600;}" +
          "#automation-control-panel .acp-title{display:flex;align-items:center;gap:8px;font-size:14px;}" +
          "#automation-control-panel .acp-actions{display:flex;gap:6px;}" +
          "#automation-control-panel .acp-btn{border:0;background:transparent;color:#fff;cursor:pointer;font-size:14px;opacity:.9}" +
          "#automation-control-panel .acp-btn:hover{opacity:1}" +
          "#automation-control-panel .acp-body{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}" +
          "#automation-control-panel .acp-row{grid-column:1/-1;display:flex;gap:8px;align-items:center;}" +
          "#automation-control-panel .acp-separator{grid-column:1/-1;height:1px;background:#dee2e6;margin:4px 0;}" +
          "#automation-control-panel .acp-adv-toggle{grid-column:1/-1;padding:8px;text-align:center;background:#f9fafb;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#6b7280;}" +
          "#automation-control-panel .acp-adv-toggle:hover{background:#f3f4f6;}" +
          "#automation-control-panel .acp-adv-panel{grid-column:1/-1;}" +
          "#automation-control-panel .acp-progress-bar{grid-column:1/-1;position:relative;height:24px;background:#f1f3f5;border-radius:12px;overflow:hidden;margin-bottom:4px;}" +
          "#automation-control-panel .acp-progress-fill{position:absolute;top:0;left:0;height:100%;background:linear-gradient(90deg,#10b981,#059669);transition:width .3s ease;}" +
          "#automation-control-panel .acp-progress-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:600;color:#374151;z-index:1;}" +
          "#automation-control-panel .acp-stats{grid-column:1/-1;display:flex;justify-content:space-around;padding:4px 0;font-size:12px;font-weight:500;}" +
          "#automation-control-panel .acp-stats .stat-success{color:#10b981;}" +
          "#automation-control-panel .acp-stats .stat-failed{color:#ef4444;}" +
          "#automation-control-panel .acp-stats .stat-time{color:#6b7280;}" +
          "#automation-control-panel input[type='text'],#automation-control-panel input[type='number']{flex:1;border:1px solid #ced4da;border-radius:6px;padding:6px 8px;font-size:13px;}" +
          "#automation-control-panel button.primary{background:#28a745;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.primary:hover{background:#218838;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.secondary{background:#17a2b8;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.secondary:hover{background:#138496;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.success{background:#10b981;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.success:hover{background:#059669;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.light{background:#f1f3f5;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.light:hover{background:#e2e6ea;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.warn{background:#ffc107;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.warn:hover{background:#e0a800;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.error{background:#dc3545;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.error:hover{background:#c82333;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel button.info{background:#6f42c1;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
          "#automation-control-panel button.info:hover{background:#5e35b1;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
          "#automation-control-panel .muted{color:#6c757d;font-size:12px;}"
        );
    }

    /**
     * 获取拖拽功能代码
     */
    getDragFunctionality() {
        return `
    (function(){
      var isDown=false, sx=0, sy=0, startRight=0, startBottom=0;
      header.addEventListener('mousedown', function(e){ isDown=true; sx=e.clientX; sy=e.clientY; var rect=panel.getBoundingClientRect(); startRight = window.innerWidth - rect.right; startBottom = window.innerHeight - rect.bottom; document.body.style.userSelect='none'; });
      window.addEventListener('mouseup', function(){ isDown=false; document.body.style.userSelect=''; });
      window.addEventListener('mousemove', function(e){ if(!isDown) return; var dx=e.clientX - sx; var dy=e.clientY - sy; panel.style.right = Math.max(0, startRight - dx) + 'px'; panel.style.bottom = Math.max(0, startBottom - dy) + 'px'; });
    })();`;
    }
}

// 导出
window.ControlPanelManager = ControlPanelManager;
