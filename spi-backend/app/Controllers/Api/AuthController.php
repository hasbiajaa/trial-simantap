<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\Shield\Entities\User;

class AuthController extends ResourceController
{
    public function login()
    {
        $credentials = $this->request->getJSON(true);
        
        // We use 'session' authenticator to verify email & password 
        // because the default authenticator is set to 'jwt' which expects a token.
        $result = auth('session')->attempt($credentials);
        if (!$result->isOK()) {
            return $this->failUnauthorized($result->reason());
        }

        $user = auth('session')->user();
        $jwtManager = service('jwtmanager');
        $token = $jwtManager->generateToken($user);
        
        return $this->respond([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'email' => $user->email,
                'name'  => $user->username
            ]
        ]);
    }

    public function register()
    {
        $data = $this->request->getJSON(true);
        $users = auth()->getProvider();

        $user = new User([
            'username' => $data['username'] ?? null,
            'email'    => $data['email'] ?? null,
            'password' => $data['password'] ?? null,
        ]);

        if (!$users->save($user)) {
            return $this->failValidationErrors($users->errors());
        }
        
        $user = $users->findById($users->getInsertID());
        $users->addToDefaultGroup($user);

        return $this->respondCreated(['message' => 'User registered successfully']);
    }
}
