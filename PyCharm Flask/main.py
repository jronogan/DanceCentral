import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from resources.users import users
from resources.users_roles import users_roles
from resources.roles import roles
from resources.users_skills import users_skills
from resources.employers import employers
from resources.gigs import gigs
from resources.members import employer_members
from resources.applications import applications
from resources.gigs_roles import gigs_roles
from resources.application_roles import applications_roles
from resources.skills import skills
from resources.event_types import event_types
from resources.application_status import application_status
from resources.member_types import member_types
from resources.uploads import uploads
from resources.user_media import user_media

app = Flask(__name__)
CORS(app)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
JWTManager(app)

# SECURITY
# helmet => flask-talisman
# limiter => flask-limiter
app.register_blueprint(users, url_prefix='/users')
app.register_blueprint(users_roles, url_prefix='/users-roles')
app.register_blueprint(roles, url_prefix='/roles')
app.register_blueprint(skills, url_prefix='/skills')
app.register_blueprint(users_skills, url_prefix='/users-skills')
app.register_blueprint(employers, url_prefix='/employers')
app.register_blueprint(gigs, url_prefix='/gigs')

app.register_blueprint(event_types, url_prefix='/event-types')
app.register_blueprint(employer_members, url_prefix='/employer-members')
app.register_blueprint(member_types, url_prefix='/member-types')
app.register_blueprint(applications, url_prefix='/applications')
app.register_blueprint(gigs_roles, url_prefix='/gigs-roles')
app.register_blueprint(applications_roles, url_prefix='/applications-roles')
app.register_blueprint(application_status, url_prefix='/application-status')
app.register_blueprint(uploads, url_prefix='/uploads')
app.register_blueprint(user_media, url_prefix='/users')


if __name__ == '__main__':
    app.run(port=5002, debug=os.getenv('DEBUG', False))