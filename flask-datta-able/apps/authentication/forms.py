# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SelectField
from wtforms.validators import Email, DataRequired

# login form
class LoginForm(FlaskForm):
    username = StringField('Username',
                           id='username_login',
                           validators=[DataRequired()])
    password = PasswordField('Password',
                             id='pwd_login',
                             validators=[DataRequired()])

# choices for role
role_choices = [
    ('Civilian', 'Civilian'),
    ('Medic', 'Medic'),
    ('Engineer', 'Engineer'),
    ('Trader', 'Trader'),
    ('Journalist', 'Journalist')
]

# registration form
class CreateAccountForm(FlaskForm):
    username = StringField('Username',
                           id='username_create',
                           validators=[DataRequired()])
    email = StringField('Email',
                        id='email_create',
                        validators=[DataRequired(), Email()])
    password = PasswordField('Password',
                             id='pwd_create',
                             validators=[DataRequired()])
    role = SelectField('Role', choices=role_choices, id='role_create', validators=[DataRequired()])
