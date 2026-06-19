import os

amqp_uri = "pyamqp://{}:{}@{}:5672/".format(
    os.environ['RABBIT_USER'],
    os.environ['RABBIT_PASS'],
    os.environ['RABBIT_HOST'],
)

config = 'AMQP_URI: "{}"\n'.format(amqp_uri)

if os.environ.get('DB_HOST'):
    db_uri = "postgresql+pg8000://{}:{}@{}:5432/{}".format(
        os.environ['DB_USER'],
        os.environ['DB_PASS'],
        os.environ['DB_HOST'],
        os.environ['DB_NAME'],
    )
    config += 'DB_URIS:\n  "penawaran_kelas:Base": "{}"\n'.format(db_uri)

with open('runtime_config.yaml', 'w') as f:
    f.write(config)

print("Config written to runtime_config.yaml")
