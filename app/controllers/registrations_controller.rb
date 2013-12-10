class RegistrationsController < Devise::RegistrationsController
  view_paths = ['app/views/registrations']

  protected

  def devise_parameter_sanitizer    
    User::ParameterSanitizer.new(User, :user, params)
  end
end
