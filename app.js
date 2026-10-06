(() => {
  'use strict';

  const STORAGE = {
    users: 'taskflow_users_v1',
    tasks: 'taskflow_tasks_v1',
    projects: 'taskflow_projects_v1',
    activity: 'taskflow_activity_v1',
    notifications: 'taskflow_notifications_v1',
    session: 'taskflow_session_v1',
    prefs: 'taskflow_prefs_v1',
    seeded: 'taskflow_seeded_v1'
  };

  const state = {
    users: [], tasks: [], projects: [], activity: [], notifications: [], session: null,
    prefs: { deadlines: true, assignments: true, activity: true },
    activeView: 'dashboard', calendarDate: new Date(), calendarView: 'month', taskFilters: { search: '', project: 'all', priority: 'all', assignee: 'all' },
    timer: { seconds: 25 * 60, running: false, interval: null, taskId: null }
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const todayKey = () => toDateKey(new Date());
  const dateOnly = (value) => new Date(`${value}T12:00:00`);
  const toDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fmtDate = (value, options = {}) => value ? dateOnly(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...options }) : '—';
  const fmtDateLong = (value) => value ? dateOnly(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0,2).map(s => s[0]).join('').toUpperCase() || 'U';
  const escapeHTML = (str='') => String(str).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const save = () => {
    localStorage.setItem(STORAGE.users, JSON.stringify(state.users));
    localStorage.setItem(STORAGE.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE.projects, JSON.stringify(state.projects));
    localStorage.setItem(STORAGE.activity, JSON.stringify(state.activity));
    localStorage.setItem(STORAGE.notifications, JSON.stringify(state.notifications));
    localStorage.setItem(STORAGE.prefs, JSON.stringify(state.prefs));
    if (state.session) localStorage.setItem(STORAGE.session, JSON.stringify(state.session));
  };
  const load = () => {
    state.users = JSON.parse(localStorage.getItem(STORAGE.users) || '[]');
    state.tasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]');
    state.projects = JSON.parse(localStorage.getItem(STORAGE.projects) || '[]');
    state.activity = JSON.parse(localStorage.getItem(STORAGE.activity) || '[]');
    state.notifications = JSON.parse(localStorage.getItem(STORAGE.notifications) || '[]');
    state.prefs = { ...state.prefs, ...(JSON.parse(localStorage.getItem(STORAGE.prefs) || '{}')) };
    state.session = JSON.parse(localStorage.getItem(STORAGE.session) || 'null');
  };

  function seedData(force = false) {
    if (!force && localStorage.getItem(STORAGE.seeded) === '1') return;
    if (force) Object.values(STORAGE).forEach(k => { if (k !== STORAGE.session) localStorage.removeItem(k); });
    const now = new Date();
    const day = n => { const d = new Date(now); d.setDate(d.getDate() + n); return toDateKey(d); };
    const adminId = 'usr_admin';
    const aaron = 'usr_aaron', maya = 'usr_maya', priya = 'usr_priya';
    state.users = [
      { id: adminId, name: 'Aarav Sharma', email: 'admin@taskflow.app', password: 'admin123', role: 'Admin', workspace: 'TaskFlow Studio', joined: day(-60) },
      { id: aaron, name: 'John Carter', email: 'john@taskflow.app', password: 'john123', role: 'Manager', workspace: 'TaskFlow Studio', joined: day(-42) },
      { id: maya, name: 'Maya Singh', email: 'maya@taskflow.app', password: 'maya123', role: 'Member', workspace: 'TaskFlow Studio', joined: day(-30) },
      { id: priya, name: 'Priya Nair', email: 'priya@taskflow.app', password: 'priya123', role: 'Member', workspace: 'TaskFlow Studio', joined: day(-21) }
    ];
    state.projects = [
      { id:'prj_product', name:'Product Launch', description:'Ship the next public release with a calm handoff.', due: day(8), accent:'sage', ownerId: aaron },
      { id:'prj_website', name:'Website Refresh', description:'A warmer, faster marketing site for the new quarter.', due: day(15), accent:'sky', ownerId: maya },
      { id:'prj_study', name:'Study Sprint', description:'Focused semester prep with visible milestones.', due: day(5), accent:'coral', ownerId: priya },
      { id:'prj_ops', name:'Operations', description:'Keep recurring team systems clean and reliable.', due: day(22), accent:'sand', ownerId: adminId }
    ];
    state.tasks = [
      { id:'tsk_1', title:'Finalize launch checklist', description:'Confirm final QA, assets and release notes.', projectId:'prj_product', priority:'high', due:day(2), status:'progress', assigneeId:aaron, tags:['launch','qa'], createdBy:aaron },
      { id:'tsk_2', title:'Client meeting prep', description:'Pull decisions, open questions and next steps.', projectId:'prj_website', priority:'medium', due:day(0), status:'todo', assigneeId:maya, tags:['client'], createdBy:aaron },
      { id:'tsk_3', title:'Review analytics dashboard', description:'Validate weekly KPI definitions and data freshness.', projectId:'prj_website', priority:'low', due:day(3), status:'todo', assigneeId:aaron, tags:['analytics'], createdBy:maya },
      { id:'tsk_4', title:'Submit database assignment', description:'Complete query optimization examples and notes.', projectId:'prj_study', priority:'high', due:day(1), status:'todo', assigneeId:priya, tags:['college','deadline'], createdBy:priya },
      { id:'tsk_5', title:'Design handoff', description:'Share final screens and annotate edge cases.', projectId:'prj_product', priority:'medium', due:day(-1), status:'done', assigneeId:maya, tags:['design'], createdBy:aaron },
      { id:'tsk_6', title:'Clean up component library', description:'Remove duplicate tokens and document variants.', projectId:'prj_product', priority:'low', due:day(6), status:'progress', assigneeId:maya, tags:['design-system'], createdBy:maya },
      { id:'tsk_7', title:'Prepare team retro', description:'Gather wins, friction and top experiment.', projectId:'prj_ops', priority:'medium', due:day(4), status:'progress', assigneeId:aaron, tags:['team'], createdBy:adminId },
      { id:'tsk_8', title:'Weekly study review', description:'Summarize formulas and weak topics from the week.', projectId:'prj_study', priority:'low', due:day(-2), status:'done', assigneeId:priya, tags:['study'], createdBy:priya },
      { id:'tsk_9', title:'Refresh project briefs', description:'Bring all active project briefs to the new template.', projectId:'prj_ops', priority:'medium', due:day(10), status:'todo', assigneeId:adminId, tags:['ops'], createdBy:adminId }
    ];
    state.activity = [
      { id:uid('act'), type:'done', text:'Maya completed Design handoff', time:new Date(now-1000*60*28).toISOString() },
      { id:uid('act'), type:'assign', text:'Aarav assigned Client meeting prep to Maya', time:new Date(now-1000*60*85).toISOString() },
      { id:uid('act'), type:'create', text:'Priya created Weekly study review', time:new Date(now-1000*60*210).toISOString() },
      { id:uid('act'), type:'move', text:'John moved Finalize launch checklist to In Progress', time:new Date(now-1000*60*300).toISOString() }
    ];
    state.notifications = [
      { id:uid('ntf'), type:'deadline', title:'Task due today', body:'Client meeting prep is scheduled for today.', createdAt:new Date().toISOString(), read:false },
      { id:uid('ntf'), type:'deadline', title:'Deadline approaching', body:'Finalize launch checklist is due in 2 days.', createdAt:new Date(Date.now()-3600*1000).toISOString(), read:false },
      { id:uid('ntf'), type:'activity', title:'New assignment', body:'Aarav assigned Client meeting prep to Maya.', createdAt:new Date(Date.now()-3600*1000*5).toISOString(), read:false },
      { id:uid('ntf'), type:'done', title:'Task completed', body:'Design handoff was completed.', createdAt:new Date(Date.now()-3600*1000*14).toISOString(), read:true }
    ];
    state.prefs = { deadlines:true, assignments:true, activity:true };
    localStorage.setItem(STORAGE.seeded, '1');
    save();
  }

  function currentUser() { return state.users.find(u => u.id === state.session?.userId) || null; }
  function isAdmin() { return currentUser()?.role === 'Admin'; }
  function accessibleTasks() {
    const u = currentUser();
    if (!u) return [];
    return u.role === 'Admin' ? state.tasks : state.tasks.filter(t => t.assigneeId === u.id || t.createdBy === u.id || state.projects.some(p => p.id === t.projectId && p.ownerId === u.id));
  }
  function accessibleProjects() {
    const u = currentUser();
    if (!u) return [];
    return u.role === 'Admin' ? state.projects : state.projects.filter(p => p.ownerId === u.id || state.tasks.some(t => t.projectId === p.id && t.assigneeId === u.id));
  }
  function userById(id) { return state.users.find(u => u.id === id); }
  function projectById(id) { return state.projects.find(p => p.id === id); }
  function taskProject(task) { return projectById(task.projectId); }
  function projectProgress(projectId) {
    const tasks = state.tasks.filter(t => t.projectId === projectId);
    if (!tasks.length) return 0;
    return Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100);
  }
  function overdue(task) { return task.status !== 'done' && task.due < todayKey(); }
  function dueSoon(task) { if (task.status === 'done') return false; const delta=(dateOnly(task.due)-dateOnly(todayKey()))/86400000; return delta >= 0 && delta <= 3; }
  function relativeTime(iso) {
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime())/60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs/24)}d ago`;
  }
  function statusLabel(s) { return s === 'progress' ? 'In Progress' : s === 'done' ? 'Completed' : 'To Do'; }
  function colorForUser(id) { const users = state.users; const idx=Math.max(0, users.findIndex(u=>u.id===id)); return [ ['#D7E8D3','#416549'], ['#E6E0D2','#73633E'], ['#DCEAF3','#4D6E83'], ['#F3DCD6','#915D4B'] ][idx%4]; }

  function showToast(title, message, type='sage') {
    const el = document.createElement('div'); el.className = `toast ${type==='coral'?'coral':''}`;
    el.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span>`;
    $('#toast-root').appendChild(el); setTimeout(()=>el.remove(), 3300);
  }

  function logActivity(text, type='activity') {
    state.activity.unshift({ id:uid('act'), type, text, time:new Date().toISOString() });
    state.activity = state.activity.slice(0, 20); save();
  }

  function addNotification(title, body, type='activity') {
    const relevant = type==='deadline' ? state.prefs.deadlines : type==='assignment' ? state.prefs.assignments : state.prefs.activity;
    if (!relevant) return;
    state.notifications.unshift({ id:uid('ntf'), type, title, body, createdAt:new Date().toISOString(), read:false });
    state.notifications = state.notifications.slice(0, 30); save();
  }

  function setView(view) {
    if (view === 'admin' && !isAdmin()) { showToast('Admin access', 'Only administrators can open the Admin Console.', 'coral'); return; }
    state.activeView = view;
    $$('.view').forEach(v => v.classList.toggle('active-view', v.id === `view-${view}`));
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $('#profile-popover')?.classList.add('hidden');
    if (view === 'dashboard') renderDashboard();
    if (view === 'tasks') renderTasks();
    if (view === 'projects') renderProjects();
    if (view === 'calendar') renderCalendar();
    if (view === 'team') renderTeam();
    if (view === 'notifications') renderNotifications();
    if (view === 'settings') renderSettings();
    if (view === 'admin') renderAdmin();
  }

  function renderShell() {
    const u = currentUser();
    if (!u) return;
    $('#sidebar-name').textContent = u.name;
    $('#sidebar-role').textContent = `${u.role} · ${u.workspace}`;
    $('#sidebar-avatar').textContent = initials(u.name);
    $('#topbar-avatar').textContent = initials(u.name);
    $('.admin-only').classList.toggle('hidden', !isAdmin());
    $('#notification-pip').style.display = state.notifications.some(n=>!n.read) ? 'block' : 'none';
    $('#nav-notification-count').textContent = state.notifications.filter(n=>!n.read).length;
    $('#nav-notification-count').classList.toggle('hidden', !state.notifications.some(n=>!n.read));
    $('#nav-task-count').textContent = accessibleTasks().filter(t=>t.status!=='done').length;
  }

  function renderDashboard() {
    const u=currentUser(); if (!u) return;
    const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const tasks=accessibleTasks(); const active=tasks.filter(t=>t.status!=='done').length; const due=tasks.filter(dueSoon).length; const done=tasks.filter(t=>t.status==='done').length; const late=tasks.filter(overdue).length;
    $('#welcome-title').innerHTML = `${greet}, ${escapeHTML(u.name.split(' ')[0])} <span>✦</span>`;
    $('#welcome-subtitle').textContent = `You have ${active} active task${active===1?'':'s'} and ${due} deadline${due===1?'':'s'} to watch today.`;
    $('#stat-active').textContent=active; $('#stat-due').textContent=due; $('#stat-completed').textContent=done; $('#stat-overdue').textContent=late;
    $('#stat-completion-rate').textContent=`${tasks.length ? Math.round(done/tasks.length*100) : 0}% completion`;
    const todayTasks=tasks.filter(t=>t.due===todayKey()).sort((a,b)=>a.status.localeCompare(b.status));
    $('#today-task-list').innerHTML = todayTasks.length ? todayTasks.map(taskRowHTML).join('') : `<div class="empty-state">No tasks due today. Nice and clear. ✦</div>`;
    const projects=accessibleProjects().slice(0,4); $('#dashboard-projects').innerHTML = projects.length ? projects.map(projectProgressHTML).join('') : `<div class="empty-state">Create your first project to track progress.</div>`;
    const up=tasks.filter(t=>t.status!=='done').sort((a,b)=>a.due.localeCompare(b.due)).slice(0,2);
    $('#up-next-list').innerHTML = up.length ? up.map((t,i)=>`<div class="up-item ${t.priority==='high'?'coral':''}"><i></i><div><strong>${escapeHTML(t.title)}</strong><small>${fmtDate(t.due)} · ${statusLabel(t.status)}</small></div></div>`).join('') : `<div class="up-item"><i></i><div><strong>Everything is clear</strong><small>Enjoy the breathing room.</small></div></div>`;
    renderMiniCalendar();
    const taskName = state.timer.taskId ? state.tasks.find(t=>t.id===state.timer.taskId)?.title : up[0]?.title;
    $('#focus-task-name').textContent = taskName || 'Pick a task';
    renderTimerDisplay();
  }

  function taskRowHTML(task) {
    const p=taskProject(task), u=userById(task.assigneeId); return `<div class="task-row"><button class="task-check ${task.status==='done'?'done':''}" data-toggle-task="${task.id}">${task.status==='done'?'✓':''}</button><div class="task-copy"><strong>${escapeHTML(task.title)}</strong><small><span class="priority-dot ${task.priority}"></span>${escapeHTML(p?.name||'No project')} · ${escapeHTML(u?.name||'Unassigned')}</small></div><span class="task-time">${task.due===todayKey()?'Today':fmtDate(task.due)}</span><button class="menu-dot" data-edit-task="${task.id}">···</button></div>`;
  }
  function projectProgressHTML(p){ const pr=projectProgress(p.id); const owner=userById(p.ownerId); return `<div class="progress-item"><div class="progress-meta"><div><strong>${escapeHTML(p.name)}</strong><small> · ${escapeHTML(owner?.name||'Team')}</small></div><strong>${pr}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pr}%"></div></div><small>Due ${fmtDate(p.due)}</small></div>`; }

  function renderMiniCalendar(){
    const d=state.calendarDate; $('#mini-calendar-title').textContent=d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    const year=d.getFullYear(), month=d.getMonth(); const first=new Date(year,month,1); const offset=(first.getDay()+6)%7; const last=new Date(year,month+1,0).getDate();
    const tasks=accessibleTasks(); const frag=[]; ['M','T','W','T','F','S','S'].forEach(x=>frag.push(`<div class="mini-day-name">${x}</div>`));
    const prevLast=new Date(year,month,0).getDate(); for(let i=offset-1;i>=0;i--) frag.push(`<div class="mini-day muted">${prevLast-i}</div>`);
    for(let day=1;day<=last;day++){ const k=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; const has=tasks.some(t=>t.due===k); frag.push(`<button class="mini-day ${k===todayKey()?'today ':''}${has?'has-task':''}" data-calendar-date="${k}">${day}</button>`); }
    const rem=(7-(frag.length%7))%7; for(let i=1;i<=rem;i++) frag.push(`<div class="mini-day muted">${i}</div>`);
    $('#mini-calendar-grid').innerHTML=frag.join('');
  }

  function updateFilterOptions(){
    const projects=accessibleProjects(), users=state.users.filter(u=>u.workspace===currentUser()?.workspace); const pSel=$('#task-project-filter'), aSel=$('#task-assignee-filter');
    pSel.innerHTML='<option value="all">All projects</option>'+projects.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
    aSel.innerHTML='<option value="all">Everyone</option>'+users.map(u=>`<option value="${u.id}">${escapeHTML(u.name)}</option>`).join('');
    pSel.value=state.taskFilters.project; aSel.value=state.taskFilters.assignee; $('#task-priority-filter').value=state.taskFilters.priority;
  }
  function filterTasks(){ const f=state.taskFilters; return accessibleTasks().filter(t=>{const p=projectById(t.projectId); return (!f.search || `${t.title} ${t.description} ${(p?.name||'')} ${(t.tags||[]).join(' ')}`.toLowerCase().includes(f.search.toLowerCase())) && (f.project==='all'||t.projectId===f.project) && (f.priority==='all'||t.priority===f.priority) && (f.assignee==='all'||t.assigneeId===f.assignee);}); }
  function taskCardHTML(t){
    const p=taskProject(t), u=userById(t.assigneeId); const tags=(t.tags||[]).slice(0,3).map(x=>`<span class="tag">${escapeHTML(x)}</span>`).join(''); const dueClass=overdue(t)?'overdue':''; const colors=colorForUser(u?.id);
    return `<article class="task-card" draggable="true" data-task-card="${t.id}"><div class="task-card-top"><span class="priority-dot ${t.priority}" title="${t.priority}"></span><button class="menu-dot" data-edit-task="${t.id}">···</button></div><h3>${escapeHTML(t.title)}</h3><p>${escapeHTML(t.description||'No description')}</p><div class="task-tags">${tags}</div><div class="task-card-bottom"><span class="deadline-chip ${dueClass}">${overdue(t)?'Overdue · ':''}${fmtDate(t.due)}</span><div class="member-stack"><span class="avatar" style="background:${colors[0]};color:${colors[1]}">${initials(u?.name||'U')}</span></div></div></article>`;
  }
  function renderTasks(){
    updateFilterOptions(); const buckets={todo:[],progress:[],done:[]}; filterTasks().forEach(t=>(buckets[t.status]||buckets.todo).push(t));
    const labels={todo:'To Do',progress:'In Progress',done:'Completed'};
    $('#kanban-board').innerHTML=['todo','progress','done'].map(s=>`<section class="kanban-col ${s}" data-drop-status="${s}"><div class="kanban-head"><div class="kanban-title"><i></i><strong>${labels[s]}</strong></div><span class="count-pill">${buckets[s].length}</span></div><div class="kanban-list">${buckets[s].length ? buckets[s].map(taskCardHTML).join('') : `<div class="empty-state">Drop tasks here</div>`}</div></section>`).join('');
    bindTaskDnD();
  }
  function bindTaskDnD(){
    $$('.task-card').forEach(card=>{
      card.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/task-id',card.dataset.taskCard); card.classList.add('dragging'); });
      card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
    });
    $$('.kanban-col').forEach(col=>{ col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drag-over')}); col.addEventListener('dragleave',()=>col.classList.remove('drag-over')); col.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('drag-over'); const id=e.dataTransfer.getData('text/task-id'); updateTaskStatus(id,col.dataset.dropStatus);}); });
  }
  function updateTaskStatus(id,status){ const task=state.tasks.find(t=>t.id===id); if(!task||task.status===status)return; task.status=status; const u=currentUser(); logActivity(`${u.name} moved ${task.title} to ${statusLabel(status)}`,'move'); if(status==='done') addNotification('Task completed',`${task.title} was marked completed.`,'activity'); save(); renderAll(); showToast('Task updated',`${task.title} → ${statusLabel(status)}`); }

  function renderProjects(){
    const ps=accessibleProjects(); $('#project-grid').innerHTML = ps.length ? ps.map(p=>{const pr=projectProgress(p.id), owner=userById(p.ownerId), count=state.tasks.filter(t=>t.projectId===p.id).length, members=[...new Set(state.tasks.filter(t=>t.projectId===p.id).map(t=>t.assigneeId))].slice(0,3); return `<article class="project-card card ${p.accent}"><div class="project-top"><div><span class="eyebrow">PROJECT</span><h2>${escapeHTML(p.name)}</h2><p>${escapeHTML(p.description||'')}</p></div><button class="menu-dot" data-project-menu="${p.id}">···</button></div><div class="project-stats"><span>${count} task${count===1?'':'s'}</span><strong>${pr}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pr}%"></div></div><div class="project-members"><div class="member-stack">${members.map(id=>`<span class="avatar">${initials(userById(id)?.name||'')}</span>`).join('')}</div><span class="project-due">Due ${fmtDate(p.due)} · Owner ${escapeHTML(owner?.name||'Team')}</span></div></article>`}).join('') : `<div class="empty-state" style="grid-column:1/-1">No projects yet. Create one to give your tasks a home.</div>`;
  }

  function calendarCells(){
    const d=state.calendarDate, year=d.getFullYear(), month=d.getMonth(); const first=new Date(year,month,1), offset=(first.getDay()+6)%7, days=new Date(year,month+1,0).getDate(), prevDays=new Date(year,month,0).getDate(); const cells=[];
    for(let i=offset-1;i>=0;i--) cells.push({key:toDateKey(new Date(year,month-1,prevDays-i)), day:prevDays-i, muted:true});
    for(let day=1;day<=days;day++) cells.push({key:`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,day});
    let n=1; while(cells.length%7) cells.push({key:toDateKey(new Date(year,month+1,n)),day:n++,muted:true}); return cells;
  }
  function renderCalendar(){
    const d=state.calendarDate; $('#calendar-title').textContent=d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    const tasks=accessibleTasks();
    if(state.calendarView==='month'){
      const cells=calendarCells(); $('#calendar-body').innerHTML=`<div class="calendar-month"><div class="cal-week-head">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div>${x}</div>`).join('')}</div><div class="cal-month-grid">${cells.map(c=>{const ds=tasks.filter(t=>t.due===c.key).slice(0,4); return `<div class="cal-day ${c.muted?'muted':''} ${c.key===todayKey()?'today':''}" data-drop-date="${c.key}"><div class="cal-date">${c.day}</div>${ds.map(t=>`<div class="calendar-task ${t.priority} ${t.status==='done'?'done':''}" draggable="true" data-calendar-task="${t.id}">${escapeHTML(t.title)}</div>`).join('')}${tasks.filter(t=>t.due===c.key).length>4?`<div style="font-size:9px;color:#9AA39F;margin-top:5px">+${tasks.filter(t=>t.due===c.key).length-4} more</div>`:''}</div>`}).join('')}</div></div>`;
    } else renderWeekCalendar(tasks);
    bindCalendarDnD();
  }
  function renderWeekCalendar(tasks){
    const start=new Date(state.calendarDate); const dow=(start.getDay()+6)%7; start.setDate(start.getDate()-dow); const days=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d}); $('#calendar-range').textContent=`${fmtDate(toDateKey(days[0]))} — ${fmtDate(toDateKey(days[6]))}`;
    const cells=[]; cells.push(`<div class="week-label">WEEK</div>`); days.forEach(d=>cells.push(`<div class="week-label">${d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}</div>`));
    for(let row=0;row<5;row++){cells.push(`<div class="week-label">Block ${row+1}</div>`);days.forEach(d=>{const key=toDateKey(d);const dayTasks=tasks.filter(t=>t.due===key).slice(row,row+1);cells.push(`<div class="week-slot" data-drop-date="${key}">${dayTasks.map(t=>`<div class="week-task" draggable="true" data-calendar-task="${t.id}">${escapeHTML(t.title)}</div>`).join('')}</div>`)});}
    $('#calendar-body').innerHTML=`<div class="week-grid">${cells.join('')}</div>`;
  }
  function bindCalendarDnD(){
    $$('[data-calendar-task]').forEach(el=>el.addEventListener('dragstart',e=>e.dataTransfer.setData('text/calendar-task',el.dataset.calendarTask)));
    $$('[data-drop-date]').forEach(el=>{el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drop-target')});el.addEventListener('dragleave',()=>el.classList.remove('drop-target'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drop-target');const id=e.dataTransfer.getData('text/calendar-task'); const task=state.tasks.find(t=>t.id===id);if(!task)return; task.due=el.dataset.dropDate; logActivity(`${currentUser().name} rescheduled ${task.title} to ${fmtDate(task.due)}`,'move'); save(); renderAll(); showToast('Date updated',`${task.title} is now due ${fmtDate(task.due)}`);})});
  }

  function renderTeam(){
    const members=state.users.filter(u=>u.workspace===currentUser()?.workspace); $('#member-count').textContent=`${members.length} member${members.length===1?'':'s'}`;
    $('#member-list').innerHTML=members.map(u=>{const ts=state.tasks.filter(t=>t.assigneeId===u.id), active=ts.filter(t=>t.status!=='done').length, pr=ts.length?Math.round(ts.filter(t=>t.status==='done').length/ts.length*100):0;return `<div class="member-row"><span class="avatar">${initials(u.name)}</span><div class="member-info"><strong>${escapeHTML(u.name)}</strong><small>${escapeHTML(u.role)} · ${escapeHTML(u.email)}</small></div><div class="member-load"><span>${active} active</span><div class="member-load-track"><i style="width:${Math.min(100,Math.max(8,active*18))}%"></i></div></div><span style="font-size:10px;color:var(--sage);font-weight:850">${pr}%</span></div>`}).join('');
    $('#activity-list').innerHTML=state.activity.slice(0,7).map(a=>`<div class="activity-item"><div class="activity-icon">${a.type==='done'?'✓':a.type==='assign'?'↗':a.type==='move'?'↔':'✦'}</div><div><strong>${escapeHTML(a.text)}</strong><p>${relativeTime(a.time)}</p></div></div>`).join('');
    const max=Math.max(1,...members.map(u=>state.tasks.filter(t=>t.assigneeId===u.id&&t.status!=='done').length)); $('#workload-list').innerHTML=members.map(u=>{const count=state.tasks.filter(t=>t.assigneeId===u.id&&t.status!=='done').length;return `<div class="workload-row"><strong>${escapeHTML(u.name.split(' ')[0])}</strong><div class="workload-track"><i style="width:${count/max*100}%"></i></div><span>${count}</span></div>`}).join('');
  }

  function renderNotifications(){ $('#notification-list').innerHTML=state.notifications.length?state.notifications.map(n=>`<div class="notification-item ${n.read?'':'unread'}"><div class="notification-dot ${n.type==='deadline'?'coral':n.type==='assignment'?'amber':''}"></div><div class="notification-content"><strong>${escapeHTML(n.title)}</strong><p>${escapeHTML(n.body)}</p><small>${relativeTime(n.createdAt)}</small></div>${n.read?'':'<button class="outline-btn" data-read-notification="'+n.id+'">Mark read</button>'}</div>`).join(''):`<div class="empty-state">You're all caught up. ✦</div>`; renderShell(); }

  function renderSettings(){ const u=currentUser(); $('#profile-name').value=u?.name||''; $('#profile-email').value=u?.email||''; $('#profile-workspace').value=u?.workspace||''; $('#pref-deadlines').checked=!!state.prefs.deadlines; $('#pref-assignments').checked=!!state.prefs.assignments; $('#pref-activity').checked=!!state.prefs.activity; }

  function renderAdmin(){ if(!isAdmin())return; $('#admin-users-stat').textContent=state.users.length; $('#admin-tasks-stat').textContent=state.tasks.length; $('#admin-completed-stat').textContent=state.tasks.filter(t=>t.status==='done').length; $('#admin-overdue-stat').textContent=state.tasks.filter(overdue).length;
    $('#admin-users-table').innerHTML=state.users.map(u=>`<tr><td><div class="table-user"><span class="avatar">${initials(u.name)}</span><div><strong>${escapeHTML(u.name)}</strong><small>${escapeHTML(u.email)}</small></div></div></td><td>${escapeHTML(u.role)}</td><td>${state.tasks.filter(t=>t.assigneeId===u.id).length}</td><td>${fmtDate(u.joined,{year:'numeric'})}</td><td><div class="table-actions">${u.id!=='usr_admin'?`<button data-admin-delete-user="${u.id}">Remove</button>`:''}</div></td></tr>`).join('');
    $('#admin-projects-table').innerHTML=state.projects.map(p=>`<tr><td>${escapeHTML(p.name)}</td><td>${escapeHTML(userById(p.ownerId)?.name||'—')}</td><td><strong>${projectProgress(p.id)}%</strong></td><td>${fmtDate(p.due)}</td><td><div class="table-actions"><button data-admin-project-view="${p.id}">View</button></div></td></tr>`).join('');
    const total=state.tasks.length||1, done=state.tasks.filter(t=>t.status==='done').length, progress=state.tasks.filter(t=>t.status==='progress').length, todo=state.tasks.filter(t=>t.status==='todo').length, late=state.tasks.filter(overdue).length; const vals=[done,progress,todo,late]; $('#admin-report-chart').innerHTML=vals.map((v,i)=>`<div class="report-bar"><i style="height:${Math.max(8,v/total*140)}px"></i><small>${['Done','Live','Queue','Late'][i]}</small></div>`).join(''); $('#admin-report-rate').textContent=`${Math.round(done/total*100)}%`;
    $('#admin-notices').innerHTML=state.notifications.slice(0,5).map(n=>`<div class="notice-item"><strong>${escapeHTML(n.title)}</strong><p>${escapeHTML(n.body)}</p><small>${relativeTime(n.createdAt)}</small></div>`).join('') || `<div class="empty-state">No recent notices.</div>`;
  }

  function openModal(id){ $('#'+id).classList.remove('hidden'); setTimeout(()=>$('.modal input:not([type=hidden]), .modal textarea, .modal select',$('#'+id))?.focus(),40); }
  function closeModal(id){ $('#'+id).classList.add('hidden'); }
  function populateTaskModal(task=null){
    const projects=accessibleProjects(); $('#task-project-input').innerHTML=projects.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join(''); const users=state.users.filter(u=>u.workspace===currentUser()?.workspace); $('#task-assignee-input').innerHTML=`<option value="">Unassigned</option>`+users.map(u=>`<option value="${u.id}">${escapeHTML(u.name)}</option>`).join('');
    $('#task-id').value=task?.id||''; $('#task-title-input').value=task?.title||''; $('#task-description-input').value=task?.description||''; $('#task-project-input').value=task?.projectId||projects[0]?.id||''; $('#task-priority-input').value=task?.priority||'medium'; $('#task-due-input').value=task?.due||todayKey(); $('#task-status-input').value=task?.status||'todo'; $('#task-assignee-input').value=task?.assigneeId||currentUser()?.id||''; $('#task-tags-input').value=(task?.tags||[]).join(', '); $('#task-modal-title').textContent=task?'Edit task':'Create a task'; $('#task-save-btn').textContent=task?'Save changes':'Create Task'; openModal('task-modal');
  }
  function populateProjectModal(){ $('#project-name-input').value=''; $('#project-description-input').value=''; $('#project-due-input').value=toDateKey(new Date(Date.now()+7*86400000)); $('#project-accent-input').value='sage'; openModal('project-modal'); }

  function saveTask(e){
    e.preventDefault(); const id=$('#task-id').value; const old=id?state.tasks.find(t=>t.id===id):null; const payload={title:$('#task-title-input').value.trim(),description:$('#task-description-input').value.trim(),projectId:$('#task-project-input').value,priority:$('#task-priority-input').value,due:$('#task-due-input').value,status:$('#task-status-input').value,assigneeId:$('#task-assignee-input').value||null,tags:$('#task-tags-input').value.split(',').map(x=>x.trim()).filter(Boolean)};
    if(!payload.title || !payload.projectId || !payload.due){showToast('Missing details','Add a task name, project and deadline.','coral');return;}
    if(old){Object.assign(old,payload); logActivity(`${currentUser().name} updated ${old.title}`,'activity'); if(old.assigneeId && old.assigneeId!==payload.assigneeId) addNotification('Task reassigned',`${old.title} has a new assignee.`,'assignment'); showToast('Task saved','Your changes are stored locally.');}
    else { const task={...payload,id:uid('tsk'),createdBy:currentUser().id}; state.tasks.unshift(task); logActivity(`${currentUser().name} created ${task.title}`,'create'); if(payload.assigneeId && payload.assigneeId!==currentUser().id) addNotification('New task assigned',`${task.title} was assigned to ${userById(payload.assigneeId)?.name||'a teammate'}.`,'assignment'); showToast('Task created',`${task.title} is now on the board.`); }
    save(); closeModal('task-modal'); renderAll();
  }
  function saveProject(e){ e.preventDefault(); const payload={id:uid('prj'),name:$('#project-name-input').value.trim(),description:$('#project-description-input').value.trim(),due:$('#project-due-input').value,accent:$('#project-accent-input').value,ownerId:currentUser().id}; if(!payload.name||!payload.due){showToast('Missing details','Add a project name and deadline.','coral');return;} state.projects.unshift(payload); logActivity(`${currentUser().name} created ${payload.name}`,'create'); save(); closeModal('project-modal'); renderAll(); setView('projects'); showToast('Project created','Your workspace has a new project.'); }

  function toggleTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t)return; t.status=t.status==='done'?'todo':'done'; logActivity(`${currentUser().name} ${t.status==='done'?'completed':'reopened'} ${t.title}`,t.status==='done'?'done':'activity'); if(t.status==='done')addNotification('Task completed',`${t.title} was marked complete.`,'activity'); save(); renderAll(); }

  function renderTimerDisplay(){ const m=String(Math.floor(state.timer.seconds/60)).padStart(2,'0'), s=String(state.timer.seconds%60).padStart(2,'0'); $('#timer-display').textContent=`${m}:${s}`; $('#timer-main').textContent=state.timer.running?'Ⅱ Pause':'▶ Start'; }
  function toggleTimer(){ if(state.timer.running){ clearInterval(state.timer.interval); state.timer.running=false; renderTimerDisplay(); showToast('Timer paused','Take a breath and resume when ready.'); return;} state.timer.running=true; renderTimerDisplay(); state.timer.interval=setInterval(()=>{state.timer.seconds=Math.max(0,state.timer.seconds-1);renderTimerDisplay();if(state.timer.seconds===0){clearInterval(state.timer.interval);state.timer.running=false;showToast('Focus complete','25 minutes of focused work done. ✦');}},1000); }
  function adjustTimer(step){ if(state.timer.running)return; state.timer.seconds=Math.min(90*60,Math.max(5*60,state.timer.seconds+step*60));renderTimerDisplay(); }

  function exportSummary(){
    const u=currentUser(); const payload={workspace:u.workspace,user:u.name,generatedAt:new Date().toISOString(),stats:{tasks:state.tasks.length,completed:state.tasks.filter(t=>t.status==='done').length,overdue:state.tasks.filter(overdue).length,projects:state.projects.length},projects:state.projects.map(p=>({name:p.name,progress:projectProgress(p.id),due:p.due})),tasks:state.tasks.map(t=>({title:t.title,project:projectById(t.projectId)?.name,status:statusLabel(t.status),priority:t.priority,due:t.due,assignee:userById(t.assigneeId)?.name||'Unassigned'}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`taskflow-summary-${todayKey()}.json`;a.click();URL.revokeObjectURL(a.href); showToast('Export ready','Summary downloaded as JSON.');
  }

  function login(email,password){ const user=state.users.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===password); if(!user){showToast('Login failed','Check your email and password.','coral');return;} state.session={userId:user.id}; save(); openApp(); showToast('Welcome back',`Good to see you, ${user.name.split(' ')[0]}.`); }
  function signup(name,email,password,workspace){ if(state.users.some(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('Account exists','That email is already registered.','coral');return;} const user={id:uid('usr'),name,email,password,role:'Member',workspace,joined:todayKey()}; state.users.push(user); state.session={userId:user.id}; if(!state.projects.some(p=>p.ownerId===user.id)){state.projects.push({id:uid('prj'),name:'My First Project',description:'A place to turn your next idea into action.',due:toDateKey(new Date(Date.now()+7*86400000)),accent:'sage',ownerId:user.id});} addNotification('Welcome to TaskFlow','Your workspace is ready. Start by creating a task.','activity'); save(); openApp(); showToast('Account created','Your new TaskFlow workspace is ready.'); }
  function openApp(){ $('#auth-screen').classList.add('hidden'); $('#app-shell').classList.remove('hidden'); renderShell(); setView('dashboard'); }
  function doLogout(){ localStorage.removeItem(STORAGE.session); state.session=null; stopTimer(); $('#app-shell').classList.add('hidden'); $('#auth-screen').classList.remove('hidden'); }
  function stopTimer(){ if(state.timer.interval)clearInterval(state.timer.interval); state.timer.running=false; }
  function renderAll(){ renderShell(); if(state.activeView==='dashboard')renderDashboard(); if(state.activeView==='tasks')renderTasks(); if(state.activeView==='projects')renderProjects(); if(state.activeView==='calendar')renderCalendar(); if(state.activeView==='team')renderTeam(); if(state.activeView==='notifications')renderNotifications(); if(state.activeView==='settings')renderSettings(); if(state.activeView==='admin')renderAdmin(); }

  function bindEvents(){
    $$('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>{ $$('.auth-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');$('#login-form-wrap').classList.toggle('hidden',btn.dataset.authTab!=='login');$('#signup-form-wrap').classList.toggle('hidden',btn.dataset.authTab!=='signup'); }));
    $$('.password-toggle').forEach(btn=>btn.addEventListener('click',()=>{const input=$(`#${btn.dataset.target}`);input.type=input.type==='password'?'text':'password';btn.textContent=input.type==='password'?'◉':'○';}));
    $('#fill-demo').addEventListener('click',()=>{$('#login-email').value='admin@taskflow.app';$('#login-password').value='admin123';showToast('Demo ready','Admin credentials have been filled.');});
    $('#login-form').addEventListener('submit',e=>{e.preventDefault();login($('#login-email').value.trim(),$('#login-password').value);});
    $('#signup-form').addEventListener('submit',e=>{e.preventDefault();signup($('#signup-name').value.trim(),$('#signup-email').value.trim(),$('#signup-password').value,$('#signup-workspace').value.trim());});
    $$('.nav-item[data-view], [data-view]:not(.nav-item)').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.view){setView(el.dataset.view);$('#mobile-menu').focus();$('.sidebar').classList.remove('open')}}));
    $('#mobile-menu').addEventListener('click',()=>$('.sidebar').classList.add('open'));$('#mobile-close').addEventListener('click',()=>$('.sidebar').classList.remove('open'));
    $('#logout-btn').addEventListener('click',doLogout); $('#popover-logout').addEventListener('click',doLogout);
    $('#profile-btn').addEventListener('click',()=>$('#profile-popover').classList.toggle('hidden'));
    document.addEventListener('click',e=>{ if(!e.target.closest('#profile-btn')&&!e.target.closest('#profile-popover'))$('#profile-popover').classList.add('hidden'); });
    $('#global-search').addEventListener('input',e=>{const q=e.target.value.trim();if(q){setView('tasks');state.taskFilters.search=q;$('#task-search').value=q;renderTasks();}else{state.taskFilters.search='';$('#task-search').value='';renderTasks();}});
    $('#export-btn').addEventListener('click',exportSummary);$('#quick-add-btn').addEventListener('click',()=>populateTaskModal()); $('#create-task-btn').addEventListener('click',()=>populateTaskModal());
    $('#task-search').addEventListener('input',e=>{state.taskFilters.search=e.target.value;renderTasks()}); $('#task-project-filter').addEventListener('change',e=>{state.taskFilters.project=e.target.value;renderTasks()}); $('#task-priority-filter').addEventListener('change',e=>{state.taskFilters.priority=e.target.value;renderTasks()}); $('#task-assignee-filter').addEventListener('change',e=>{state.taskFilters.assignee=e.target.value;renderTasks()}); $('#clear-task-filters').addEventListener('click',()=>{state.taskFilters={search:'',project:'all',priority:'all',assignee:'all'};$('#task-search').value='';renderTasks();});
    $('#kanban-board').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-task]'); if(edit)populateTaskModal(state.tasks.find(t=>t.id===edit.dataset.editTask));}); $('#today-task-list').addEventListener('click',e=>{const toggle=e.target.closest('[data-toggle-task]'); if(toggle)toggleTask(toggle.dataset.toggleTask);const edit=e.target.closest('[data-edit-task]');if(edit)populateTaskModal(state.tasks.find(t=>t.id===edit.dataset.editTask));});
    $('#create-project-btn').addEventListener('click',populateProjectModal); $('#project-form').addEventListener('submit',saveProject);
    $('#invite-btn').addEventListener('click',()=>openModal('invite-modal')); $('#invite-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#invite-name').value.trim(),email=$('#invite-email').value.trim(),role=$('#invite-role').value; if(state.users.some(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('Already a member','That email is already in the workspace.','coral');return;} const user={id:uid('usr'),name,email,password:'invite_pending',role,workspace:currentUser().workspace,joined:todayKey()};state.users.push(user);logActivity(`${currentUser().name} invited ${name}`,'assign');addNotification('Invitation created',`${name} was added to the workspace.`,'activity');save();closeModal('invite-modal');renderAll();showToast('Member added',`${name} is now visible in Team.`);});
    $('#task-form').addEventListener('submit',saveTask); $$('.modal-backdrop').forEach(back=>back.addEventListener('mousedown',e=>{if(e.target===back)closeModal(back.id)})); $$('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.dataset.closeModal)));
    $('#mini-prev').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()-1);renderMiniCalendar()});$('#mini-next').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()+1);renderMiniCalendar()});
    $('#cal-prev').addEventListener('click',()=>{if(state.calendarView==='month')state.calendarDate.setMonth(state.calendarDate.getMonth()-1);else state.calendarDate.setDate(state.calendarDate.getDate()-7);renderCalendar()}); $('#cal-next').addEventListener('click',()=>{if(state.calendarView==='month')state.calendarDate.setMonth(state.calendarDate.getMonth()+1);else state.calendarDate.setDate(state.calendarDate.getDate()+7);renderCalendar()});$('#cal-today').addEventListener('click',()=>{state.calendarDate=new Date();renderCalendar()});$$('.seg').forEach(btn=>btn.addEventListener('click',()=>{$$('.seg').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.calendarView=btn.dataset.calendarView;renderCalendar()}));
    $('#mini-calendar-grid').addEventListener('click',e=>{const b=e.target.closest('[data-calendar-date]');if(b){state.calendarDate=dateOnly(b.dataset.calendarDate);setView('calendar')}});
    $('#mark-all-read').addEventListener('click',()=>{state.notifications.forEach(n=>n.read=true);save();renderAll();showToast('All caught up','Every notification is marked as read.');}); $('#notification-list').addEventListener('click',e=>{const b=e.target.closest('[data-read-notification]');if(b){const n=state.notifications.find(x=>x.id===b.dataset.readNotification);if(n)n.read=true;save();renderNotifications();}});
    $('#profile-form').addEventListener('submit',e=>{e.preventDefault();const u=currentUser();u.name=$('#profile-name').value.trim()||u.name;u.workspace=$('#profile-workspace').value.trim()||u.workspace;save();renderAll();showToast('Profile saved','Your details are updated.');});
    ['deadlines','assignments','activity'].forEach(k=>$('#pref-'+k).addEventListener('change',e=>{state.prefs[k]=e.target.checked;save();showToast('Preference updated','Notification settings saved.');}));
    $('#reset-data-btn').addEventListener('click',()=>{if(confirm('Reset the demo workspace? Your login session will also reset.')){stopTimer();localStorage.clear();seedData(true);state.session=null;$('#app-shell').classList.add('hidden');$('#auth-screen').classList.remove('hidden');showToast('Demo reset','Reload or log in with the demo account.');}});
    $('#admin-broadcast-btn').addEventListener('click',()=>{const title=prompt('Notice title','Workspace update');if(!title)return;const body=prompt('Notice message','A new workspace update is available.');if(!body)return;state.notifications.unshift({id:uid('ntf'),type:'activity',title,body,createdAt:new Date().toISOString(),read:false});logActivity(`${currentUser().name} published system notice: ${title}`,'activity');save();renderAll();showToast('Notice published','The system notice is now in Notifications.');});
    $('#admin-add-user').addEventListener('click',()=>openModal('invite-modal')); $('#admin-users-table').addEventListener('click',e=>{const b=e.target.closest('[data-admin-delete-user]');if(b){const u=userById(b.dataset.adminDeleteUser);if(!u)return;if(confirm(`Remove ${u.name} from the workspace?`)){state.users=state.users.filter(x=>x.id!==u.id);state.tasks=state.tasks.map(t=>t.assigneeId===u.id?{...t,assigneeId:null}:t);save();renderAll();showToast('User removed',`${u.name} has been removed.`);}}});
    $('#timer-main').addEventListener('click',toggleTimer);$$('.timer-step').forEach(b=>b.addEventListener('click',()=>adjustTimer(Number(b.dataset.step))));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-backdrop').forEach(m=>m.classList.add('hidden')); if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#global-search').focus();}});
  }

  function boot(){ load(); if(!state.users.length)seedData(); if(state.session&&currentUser()){openApp();} else {$('#auth-screen').classList.remove('hidden');$('#app-shell').classList.add('hidden');} bindEvents(); }
  boot();
})();
