from dotenv import load_dotenv

import os
import psycopg2.pool
import psycopg2.extras

load_dotenv()

pool = psycopg2.pool.SimpleConnectionPool(2, 3,
                                          host=os.getenv("DB_HOST"),
                                          user=os.getenv("DB_USER"),
                                          database=os.getenv("DB"),
                                          port=os.getenv("DB_PORT"))

def get_cursor():
    connection = pool.getconn()
    cursor = connection.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    )
    return connection, cursor


def release_connection(connection):
    pool.putconn(connection)

