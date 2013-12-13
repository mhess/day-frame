//= require util

angular.module('tasks', ['rails', 'util'])

  // All operations in this service assume an $apply context
  .service('$tasks',
           ['remoteStore', 'date2day', 'setPixelFactor', 'Time', 'Minutes',
            function(remoteStore, date2day, setPixelFactor, Time, Minutes) {
              var taskSvc = this,
              taskMap = {},
              serialDay,
              oneDay = 1000*60*60*24;
              
              this.timeline = [];
              this.backlog = [];
              this.date = new Date();

              var timeline = this.timeline;
              var backlog = this.backlog;
              var taskStore = remoteStore;

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
              
              function Task(props){angular.copy(props, this);}           
              
              Task.prototype.update = function(mod){
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
                taskStore.update(task)
                  .then(null,function(){alert("Task modification failed");});};

              Task.prototype.delete = function(){
                var task = this;
                taskStore.delete(this).then(
                  function(){
                    if ( task.start===null ) {
                      backlog.splice(backlog.indexOf(task), 1);
                    } else {
                      timeline.splice(timeline.indexOf(task), 1);}},
                  function(){alert("Task deletion failed");});};
              
              function newTask(task){
                task = new Task(task);
                taskMap[task.id] = task;
                if ( task.start===null ) backlog.push(task);
                else timeline.push(task);}

              function query(params){
                return taskStore.query(params)
                  .then(
                    function(tasks){
                      tasks.forEach(newTask);
                      timeline.sort(taskCmp);});}
              
              this.get = function(tid){return taskMap[tid]; };

              this.create = function(props) {
                if ( props.start ) props.day = serialDay;               
                taskStore.create(new Task(props))
                  .then(function(task){newTask(task);},
                        function(){alert("Task creation failed");});};

              this.setDay = function(dateObj){
                serialDay = date2day(dateObj);
                backlog.splice(0, this.backlog.length);
                timeline.splice(0, this.timeline.length);
                taskMap = {};
                return query({day: serialDay})
                  .then(function(){mutateDate(taskSvc.date, dateObj);});};

              this.changeDay = function(delta){
                if (!delta) return this.setDay(new Date());
                else return this.setDay(new Date(this.date.getTime()-(delta*oneDay)));};
              
              // initialize
              this.changeDay();
            }])

  .service('remoteStore',
           ['$http', 'Time', 'Minutes',
            function($http, Time, Minutes){
              
              var path = '/tasks';
              
              function serialize(task){
                var copy = angular.copy(task);
                if ( copy.start ) copy.start = task.start.minutes;
                  copy.duration = copy.duration.min;
                delete copy.id;
                return {task:copy};}
              
              function deserialize(task){
                task.duration = new Minutes(task.duration);
                task.start = task.start ? new Time(task.start) : null;
                return task;}

              this.create = function(task){
                return $http.post(path+'.json', serialize(task))
                  .then(
                    function(resp){
                      task.id = resp.data.id;
                      return task;});};

              this.update = function(task){
                return $http.put(path+'/'+task.id+'.json', serialize(task))
                  .then(function(){return task;});};

              this.delete = function(task){
                return $http.delete(path+'/'+task.id+'.json');};
              
              this.query = function(params){
                return $http.get(path+'.json',{params:params})
                  .then(function(resp){
                          return resp.data.map(deserialize);});};
            }]);