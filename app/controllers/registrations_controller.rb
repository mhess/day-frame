class RegistrationsController < Devise::RegistrationsController
  
  protected

  def devise_parameter_sanitizer
    User::ParameterSanitizer.new(User, :user, params)
  end
end
