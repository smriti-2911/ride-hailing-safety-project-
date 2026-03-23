import unittest
from app import app

class APITest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
    
    def test_register(self):
        response = self.client.post('/register', json={"username": "test", "password": "pass"})
        self.assertEqual(response.status_code, 201)
    
    def test_login(self):
        response = self.client.post('/login', json={"username": "test", "password": "pass"})
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
