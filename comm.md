-------Linux--------
backend :

cd backend/
--Install dependences--
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

--RUN--
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend : 

cd frontend/
--Install dependences--
npm install

--RUN--
npx expo start
npx expo start -c

--------Windows-------
backend :

cd backend/
--Install dependences--
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt

--RUN--
.\venv\Scripts\Activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


frontend :
cd frontend/
--Install dependences--
npm.cmd install

--RUN--
npx expo start