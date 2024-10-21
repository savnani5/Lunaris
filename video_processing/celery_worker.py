from app import celery, app, LunarisApp

# Initialize LunarisApp
lunaris_app = LunarisApp(debug=app.config.get('DEBUG', False))

app.app_context().push()

if __name__ == '__main__':
    celery.worker_main(['worker', '--loglevel=info'])

