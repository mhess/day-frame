//= require util
//= require angularjs/rails/resource

angular.module('tasks', ['rails', 'util'])

  // All operations in this service assume an $apply context
  .service('$tasks',
           ['railsResourceFactory', 'date2day', 'setPixelFactor', 'Time', 'Minutes',
            function(railsResourceFactory, date2day, setPixelFactor, Time, Minutes) {
              var taskSrvObj = this,
              taskMap = {},
              serialDay,
              oneDay = 1000*60*60*24;
              
              this.timeline = [];
              this.backlog = [];
              this.date = new Date();

              var timeline = this.timeline;
              var backlog = this.backlog;

              setPixelFactor(1);

              function taskCmp(t1,t2){
                if ( t1.start.lt(t2.start) ) return -1;
                if ( t1.start.gt(t2.start) ) return 1;
                return 0;}

              function mutateDate(self, other) {
                self.setFullYear(other.getFullYear());
                self.setMonth(other.getMonth());
                self.setDate(other.getDate());
                return self;}

              var RealTaskRes = railsResourceFactory({url: "/tasks", name: "task"});
              var TaskRes = RealTaskRes;
              

              // Grab original resource update method                
              var resUpdate = TaskRes.prototype.update;
              TaskRes.prototype.update = function(mod) {              
                var task = this;
                mod && angular.extend(task, mod);
                task.day = task.start===null ? null : serialDay;
                if ( task.start===null ) {
                  var tindex = timeline.indexOf(task);
                  tindex > -1 && timeline.splice(tindex, 1);
                  backlog.indexOf(task) < 0 && backlog.push(task);
                } else {
                  var bindex = backlog.indexOf(task);
                  bindex > -1 && backlog.splice(bindex, 1);
                  timeline.indexOf(task) < 0 && timeline.push(task);
                }
                timeline.sort(taskCmp);

                resUpdate.call(task)
                  .then(null, function(){ alert("Task modification failed"); });
              };

              // Grab original resource delete method
              var resDelete = TaskRes.prototype.delete;                
              TaskRes.prototype.delete = function() {
                var task = this;
                resDelete.call(task).then(
                  function(){
                    if ( task.start===null ) {
                      backlog.splice(backlog.indexOf(task), 1);
                    } else {
                      timeline.splice(timeline.indexOf(task), 1);
                    }
                  },
                  function(){alert("Task deletion failed");}
                );
              };

              // Serialize task object for server
              TaskRes.beforeRequest(
                function(data){
                  var copy = angular.copy(data);
                  if ( copy.start ) copy.start = data.start.minutes;
                  copy.duration = copy.duration.min;
                  return copy;
                });
              
              // Deserialize task object from server
              function taskFromServ(task) {
                taskMap[task.id] = task;
                task.duration = new Minutes(task.duration);
                if ( task.start===null ) {
                  taskSrvObj.backlog.push(task);
                } else {
                  task.start = new Time(task.start);
                  taskSrvObj.timeline.push(task);
                }                  
              }
              
              this.get = function(tid){ return taskMap[tid]; };

              this.create = function(taskProps) {
                if ( taskProps.start )
                  taskProps.day = day;
                new TaskRes(taskProps).create()
                  .then(function(task) { taskFromServ(task); },
                        function() { alert("Task creation failed");});};

              this.setDay = function(dateObj) {
                serialDay = date2day(dateObj);
                this.backlog.splice(0, this.backlog.length);
                this.timeline.splice(0, this.timeline.length);
                taskMap = {};
                return TaskRes.query({day: serialDay})
                  .then(function(res){
                          mutateDate(taskSrvObj.date, dateObj);
                          res.forEach(taskFromServ);
                          taskSrvObj.timeline.sort(taskCmp);});};

              this.changeDay = function(delta){
                if (!delta) return this.setDay(new Date());
                else return this.setDay(new Date(this.date.getTime()-(delta*oneDay)));};
              
              // initialize
              this.changeDay();
            }]);