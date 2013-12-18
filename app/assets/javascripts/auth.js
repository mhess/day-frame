//= require modal
//= require task_services

angular.module('auth', ['bootstrapModal', 'tasks'])
.service('$auth',
  ['$http', '$rootScope', '$window', '$modals', '$tasks',
  function($http, $rootScope, $window, $modals, $tasks) {

    var that = this;
    var $welcome = $('.welcome');

    this.logInTransition = function(){
      $welcome.animate(
        {height:'toggle'}, 1000, 'linear',
        function(){
          $rootScope.$apply(function(){
            $tasks.remote(true).changeDay();
            $rootScope.$broadcast('fixWidgetArea');});});}

    this.logInPath = '/users/sign_in.json'; //config.signInPath;
    this.registerPath = '/users.json'; //config.registerPath;
    this.signOutPath = '/users/sign_out';
    this.user = null;

    var postData = {
        remote: true,
        commit: null,
        utf8: "✓",
        user: null};

    this.logIn = function(email, pass, rem) {
      var rem = rem ? 1 : 0;
      postData.user = {email: email, password: pass, remember: rem};
      postData.commit = "Sign in";
      return $http.post(this.logInPath, postData)
        .then(
          function(resp){
            this.user = resp.data;
            return resp.data;},
          function(resp){throw resp.data;});};

    this.signUp = function(usr){
      postData.user = usr;
      postData.user.password = usr.passwd;
      postData.user.password_confirmation = usr.passwdCnf;
      postData.commit = "Sign up";
      return $http.post(this.registerPath, postData)
        .then(
          function(resp){
            this.user = resp.data;
            return resp.data;},
          function(resp){throw resp.data;});};

    this.logOut = function(){
      return $http.delete(this.signOutPath)
        .then(function(data){$window.location.reload();});};
  }]);