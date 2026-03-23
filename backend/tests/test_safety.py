import unittest
from app import app

class SafetyTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
    
    def test_safety_score(self):
        response = self.client.post('/safety_score', json={"route": "XYZ"})
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
